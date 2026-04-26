import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
  intensity?: number; // 0 to 1
}

export default function Visualizer({ state, intensity = 0 }: VisualizerProps) {
  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    const speed = baseSpeed / (1 + intensity * 2); // Speed up with intensity
    
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: { duration: speed + index * 2, repeat: Infinity, ease: "linear" }
    };
  };

  const getPulseAnimation = () => {
    const scaleMultiplier = 1 + intensity * 0.8;
    
    if (state === "speaking") {
      return {
        scale: [1, 1.15 * scaleMultiplier, 0.95, 1.1 * scaleMultiplier, 1],
        opacity: [0.8, 1, 0.7, 1, 0.8],
        transition: { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.02 * scaleMultiplier, 1],
        opacity: [0.7, 1, 0.7],
        transition: { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.02, 0.98],
        opacity: [0.6, 0.9, 0.6],
        transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
      };
    }
    return {
      scale: [1, 1.01, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    };
  };

  const getTheme = () => {
    // Dynamic color shifting based on intensity
    const intensityColor = intensity > 0.5 
      ? `rgb(255, ${Math.floor(255 - (intensity - 0.5) * 510)}, 0)` // Shift towards hot
      : "";

    switch (state) {
      case "listening": return { 
        color: intensity > 0.5 ? intensityColor : "rgba(139, 92, 246, 1)", 
        glow: "shadow-violet-500/60", 
        border: intensity > 0.3 ? "border-white" : "border-violet-400" 
      };
      case "processing": return { 
        color: "rgba(56, 189, 248, 1)", 
        glow: "shadow-sky-400/80", 
        border: "border-sky-400" 
      };
      case "speaking": return { 
        color: intensity > 0.5 ? "rgba(255, 100, 100, 1)" : "rgba(236, 72, 153, 1)", 
        glow: intensity > 0.7 ? "shadow-red-500/80" : "shadow-pink-500/80", 
        border: intensity > 0.5 ? "border-white" : "border-pink-400" 
      };
      default: return { 
        color: "rgba(6, 182, 212, 0.8)", 
        glow: "shadow-cyan-500/40", 
        border: "border-cyan-500/50" 
      };
    }
  };

  const theme = getTheme();

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Ambient Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[60%] h-[60%] rounded-full blur-[80px] ${theme.glow} transition-colors duration-200`}
        style={{ backgroundColor: theme.color, opacity: 0.15 + intensity * 0.2 }}
      />

      {/* Ring 1: Massive Outer Dashed */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className={`absolute w-[100%] h-[100%] rounded-full border-[1.5px] border-dashed ${theme.border} opacity-20`}
        style={{ scale: 1 + intensity * 0.1 }}
      />

      {/* Ring 2: Segmented Thick Ring */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className={`absolute w-[85%] h-[85%] rounded-full border-[2.5px] border-dotted ${theme.border} opacity-30`}
        style={{ scale: 1 + intensity * 0.15 }}
      />

      {/* Ring 3: Scanner Ring (Solid with gaps) */}
      <motion.div
        animate={getRingAnimation(2, false)}
        className={`absolute w-[70%] h-[70%] rounded-full border-[1.5px] ${theme.border} border-t-transparent border-b-transparent opacity-40`}
        style={{ scale: 1 + intensity * 0.2 }}
      />

      {/* Ring 4: Inner Dashed */}
      <motion.div
        animate={getRingAnimation(1, true)}
        className={`absolute w-[55%] h-[55%] rounded-full border-[2.5px] border-dashed ${theme.border} opacity-50`}
        style={{ scale: 1 + intensity * 0.25 }}
      />
      
      {/* Ring 5: Core HUD Ring */}
      <motion.div
        animate={getRingAnimation(0, false)}
        className={`absolute w-[40%] h-[40%] rounded-full border-[4px] border-dotted ${theme.border} opacity-70`}
        style={{ scale: 1 + intensity * 0.3 }}
      />

      {/* Core Circle */}
      <motion.div
        animate={getPulseAnimation()}
        className={`absolute w-[25%] h-[25%] rounded-full border-[1.5px] ${theme.border} bg-black/40 backdrop-blur-md flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]`}
        style={{ 
          boxShadow: `0 0 40px ${theme.color}, inset 0 0 30px ${theme.color}`,
          scale: 1 + intensity * 0.4
        }}
      >
        {/* Center Text */}
        <div 
          className="font-bold tracking-[0.3em] text-xl md:text-3xl lg:text-4xl text-white transition-all duration-150"
          style={{ 
            textShadow: `0 0 15px ${theme.color}, 0 0 30px ${theme.color}`,
            transform: `scale(${1 + intensity * 0.2})`,
            opacity: 0.8 + intensity * 0.2
          }}
        >
          ERA
        </div>
      </motion.div>

      {/* Dynamic Waveforms (New Visual Element) */}
      {intensity > 0.1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.4 * intensity, 0],
                scale: [0.8, 1.5 + i * 0.5],
              }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              className={`absolute rounded-full border-2 ${theme.border}`}
              style={{ width: '30%', height: '30%' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
