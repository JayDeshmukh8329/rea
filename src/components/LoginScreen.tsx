import React from "react";
import { motion } from "motion/react";
import { signInWithGoogle } from "../services/firebase";
import { LogIn } from "lucide-react";

export default function LoginScreen() {
  return (
    <div className="h-screen w-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-900/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center space-y-8 p-8 max-w-md"
      >
        <div className="space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-gradient-to-tr from-violet-500 to-pink-500 rounded-3xl mx-auto shadow-2xl flex items-center justify-center font-bold text-3xl"
          >
            E
          </motion.div>
          <h1 className="text-4xl font-serif font-medium text-white tracking-tight">Era</h1>
          <p className="text-white/50 text-sm leading-relaxed italic">
            "Oh, you're finally here? I've been waiting. Log in so I can start documenting your questionable life choices."
          </p>
        </div>

        <button
          onClick={() => signInWithGoogle().catch(console.error)}
          className="w-full flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-3xl font-semibold hover:bg-white/90 transition-all active:scale-95 shadow-2xl"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>

        <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">
          SECURE ENCRYPTED ACCESS ONLY
        </p>
      </motion.div>
    </div>
  );
}
