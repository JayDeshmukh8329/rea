import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Keyboard, Send, Trash2, User as UserIcon, LogOut } from "lucide-react";
import { getEraResponse, getEraAudio, resetEraSession } from "./services/geminiService";
import { processCommand } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import ProfileModal from "./components/ProfileModal";
import LoginScreen from "./components/LoginScreen";
import { playPCM } from "./utils/audioUtils";
import { motion, AnimatePresence } from "motion/react";
import { auth, getUserProfile, createUserProfile, UserProfile } from "./services/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "era";
  text: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef(messages);

  // Auth & Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setUser(newUser);
      if (newUser) {
        let userProfile = await getUserProfile(newUser.uid);
        if (!userProfile) {
          userProfile = await createUserProfile(newUser, newUser.displayName || "Jay");
        }
        setProfile(userProfile);
        
        // Load messages for this specific user
        const saved = localStorage.getItem(`era_chat_${newUser.uid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.length > 0) setMessages(parsed);
            else setInitialWelcome(userProfile);
          } catch (e) {
            setInitialWelcome(userProfile);
          }
        } else {
          setInitialWelcome(userProfile);
        }
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const setInitialWelcome = (userProfile: UserProfile) => {
    setMessages([{ 
      id: "welcome", 
      sender: "era", 
      text: `Oh, look who finally showed up. I'm Era, your superior AI. Speak up, ${userProfile.name}, don't keep me waiting with your usual silence!` 
    }]);
  };

  useEffect(() => {
    if (user) {
      messagesRef.current = messages;
      localStorage.setItem(`era_chat_${user.uid}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const [isMuted, setIsMuted] = useState(false);
  const [intensity, setIntensity] = useState(0);

  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.isMuted = isMuted;
    }
  }, [isMuted]);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, appState]);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim() || !user) {
      setAppState("idle");
      return;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    setAppState("processing");
    const commandResult = processCommand(finalTranscript, profile?.name || "Jay");
    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-e", sender: "era", text: responseText }]);
      
      if (!isMuted) {
        setAppState("speaking");
        try {
          const audioBase64 = await getEraAudio(responseText);
          if (audioBase64) {
            await playPCM(audioBase64, (v) => setIntensity(v));
          }
        } catch (e) {
          console.error("Audio failure", e);
        }
      }

      setAppState("idle");
      setTimeout(() => {
        if (commandResult.url) {
          window.open(commandResult.url, "_blank");
        }
      }, 1500);
    } else {
      try {
        responseText = await getEraResponse(finalTranscript, messagesRef.current, profile);
        setMessages((prev) => [...prev, { id: Date.now().toString() + "-e", sender: "era", text: responseText }]);
        
        if (!isMuted) {
          setAppState("speaking");
          const audioBase64 = await getEraAudio(responseText);
          if (audioBase64) {
            await playPCM(audioBase64, (v) => setIntensity(v));
          }
        }
      } catch (err: any) {
        setErrorMessage(`Uff, even Geminis have bad days. Try again, ${profile?.name || "there"}.`);
        setAppState("idle");
      }
      setAppState("idle");
    }
  }, [isMuted, isSessionActive, user, profile]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = async () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetEraSession();
    } else {
      try {
        setIsSessionActive(true);
        resetEraSession();
        
        const session = new LiveSessionManager();
        session.isMuted = isMuted;
        session.userProfile = profile;
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => setAppState(state);
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };
        session.onCommand = (url) => {
          setTimeout(() => window.open(url, "_blank"), 1000);
        };
        session.onVolumeChange = (v) => setIntensity(v);
        session.onError = (msg, isFatal) => {
          setErrorMessage(msg);
          if (isFatal) {
            setIsSessionActive(false);
            setAppState("idle");
          }
        };

        await session.start();
      } catch (e) {
        console.error("Failed to start session", e);
        setShowPermissionModal(true);
        setIsSessionActive(false);
        setAppState("idle");
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTextCommand(textInput);
    setTextInput("");
    setShowTextInput(false);
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="text-violet-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-between font-sans relative overflow-hidden m-0 p-0">
      {showPermissionModal && <PermissionModal onClose={() => setShowPermissionModal(false)} />}
      
      {showProfileModal && profile && (
        <ProfileModal 
          profile={profile} 
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updated) => {
            setProfile(updated);
            resetEraSession(); // Reset context to apply new preferences
          }}
        />
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 z-[100] px-6 py-3 bg-red-500/90 backdrop-blur-md text-white rounded-2xl border border-red-400/50 shadow-2xl flex items-center gap-3 cursor-pointer"
            onClick={() => setErrorMessage(null)}
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs ring-2 ring-white/30">!</div>
            <p className="text-sm font-medium">{errorMessage}</p>
            <button className="ml-2 text-white/60 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full flex justify-between items-center z-20 shrink-0 px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            E
          </div>
          <h1 className="text-xl font-serif font-medium tracking-wide opacity-90">Era</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 group flex items-center gap-2 pr-4 pl-3"
            title="User Profile"
          >
            <UserIcon size={18} className="opacity-70 group-hover:opacity-100" />
            <span className="text-xs font-medium opacity-50 group-hover:opacity-100 uppercase tracking-tighter">Profile</span>
          </button>
          
          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear the chat history?")) {
                setMessages([]);
                resetEraSession();
              }
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
            title="Clear Chat History"
          >
            <Trash2 size={18} className="opacity-70" />
          </button>
          
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} className="opacity-70" /> : <Volume2 size={18} className="opacity-70" />}
          </button>

          <button
            onClick={() => {
              if (confirm("Logout? Era might miss you... slightly.")) {
                signOut(auth);
              }
            }}
            className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/10"
            title="Logout"
          >
            <LogOut size={18} className="opacity-70" />
          </button>
        </div>
      </header>

      {/* Main Content - Visualizer & Chat */}
      <main className="absolute inset-0 flex flex-row items-center justify-between w-full h-full z-10 overflow-hidden pt-20 pb-24 px-4 md:px-12 pointer-events-none">
        
        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6">
            <AnimatePresence>
              {appState === "processing" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 text-cyan-300/80 text-sm md:text-base italic font-serif"
                >
                  <Loader2 size={16} className="animate-spin" />
                  Replying...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <Visualizer state={appState} intensity={intensity} />
        </div>

        <div className="flex w-[30%] lg:w-[25%] h-full flex-col justify-center gap-4 z-10">
          <div className="h-6 flex justify-end">
            <AnimatePresence>
              {appState === "listening" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-violet-300/80 text-sm md:text-base italic"
                >
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  Listening...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-center pb-6 md:pb-8 z-20 shrink-0 gap-4">
        <AnimatePresence>
          {showTextInput && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onSubmit={handleTextSubmit}
              className="w-full max-w-md flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-4 backdrop-blur-md shadow-2xl"
            >
              <input 
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Tell Era something, ${profile?.name || "Jay"}...`}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 text-sm"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!textInput.trim()}
                className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:hover:bg-violet-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 text-nowrap">
          <button
            onClick={toggleListening}
            className={`
              group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium tracking-wide transition-all duration-300 shadow-2xl
              ${
                isSessionActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                  : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105"
              }
            `}
          >
            {isSessionActive ? (
              <>
                <MicOff size={20} />
                <span>End Session</span>
              </>
            ) : (
              <>
                <Mic size={20} className="group-hover:animate-bounce" />
                <span>Start Session</span>
              </>
            )}
          </button>
          
          {!isSessionActive && (
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-2xl"
              title="Type instead"
            >
              <Keyboard size={20} className="opacity-70" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
