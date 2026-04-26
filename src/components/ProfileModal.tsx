import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, updateUserProfile } from "../services/firebase";
import { X, Settings, User, Sliders, Hash } from "lucide-react";

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (updated: UserProfile) => void;
}

export default function ProfileModal({ profile, onClose, onUpdate }: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [roastLevel, setRoastLevel] = useState(profile.preferences.roastLevel);
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState(profile.preferences.favoriteTopics);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        name,
        preferences: {
          roastLevel,
          favoriteTopics: topics
        }
      };
      await updateUserProfile(profile.uid, updates);
      onUpdate({ ...profile, ...updates });
      onClose();
    } catch (e) {
      console.error("Failed to update profile", e);
    } finally {
      setIsSaving(false);
    }
  };

  const addTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !topics.includes(topic.trim())) {
      setTopics([...topics, topic.trim()]);
      setTopic("");
    }
  };

  const removeTopic = (t: string) => {
    setTopics(topics.filter(item => item !== t));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-violet-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-serif font-medium text-white">Era's File on You</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Name */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60">
              <User size={16} />
              What should I call you?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500/50 transition-colors"
              placeholder="Your name..."
            />
          </div>

          {/* Roast Level */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Sliders size={16} />
              Roast Level (How much can you handle?)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setRoastLevel(level)}
                  className={`py-3 rounded-xl border transition-all text-sm font-medium capitalize ${
                    roastLevel === level
                      ? "bg-violet-500/20 border-violet-500/50 text-white"
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Hash size={16} />
              Favorite Topics (I'll keep these in mind)
            </label>
            <form onSubmit={addTopic} className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500/50 transition-colors"
                placeholder="Add a topic..."
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors"
              >
                Add
              </button>
            </form>
            <div className="flex flex-wrap gap-2 pt-2">
              {topics.map(t => (
                <span
                  key={t}
                  className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-violet-300"
                >
                  {t}
                  <button onClick={() => removeTopic(t)} className="hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-violet-500/10"
          >
            {isSaving ? "Updating dossier..." : "Save My Preferences"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
