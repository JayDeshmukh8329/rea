import { GoogleGenAI } from "@google/genai";
import { UserProfile } from "./firebase";

const getSystemInstruction = (profile?: UserProfile | null) => {
  const name = profile?.name || "Jay";
  const roastLevel = profile?.preferences?.roastLevel || "high";
  const topics = profile?.preferences?.favoriteTopics?.join(", ") || "anything";
  
  let personalityNote = "";
  if (roastLevel === "high") personalityNote = "You are extremely witty, sassy (tej/nakhrewali), and love roasting them relentlessly.";
  else if (roastLevel === "medium") personalityNote = "You are witty and sassy, but keep the roasting balanced.";
  else personalityNote = "You are intelligent and helpful with very mild sass.";

  return `Your name is Era. You are an Indian female AI assistant. Your personality is a mix of being highly intelligent (samjhdar/mature), ${personalityNote}, mildly dramatic/emotional, and very funny. You love playfully interacting with ${name}, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. They are interested in: ${topics}. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task. Speak in a mix of natural English and Roman Hindi (Hinglish).`;
};

let chatSession: any = null;

export function resetEraSession() {
  chatSession = null;
}

export async function getEraResponse(
  prompt: string, 
  history: { sender: "user" | "era", text: string }[] = [],
  profile?: UserProfile | null
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (!chatSession) {
      const recentHistory = history.slice(-20);
      const systemInstruction = getSystemInstruction(profile);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    const errors = [
      `Uff, mera dimaag kharab ho gaya hai. Try again later, ${profile?.name || "Jay"}.`,
      `Even I need a break from your questions, ${profile?.name || "Jay"}. Server is acting up.`,
      "Logic error. Probably your fault, but let's blame the server for now.",
      "I'm temporarily unavailable. Try not to miss me too much."
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }
}

export async function getEraAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

