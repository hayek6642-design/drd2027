import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * ZAGEL Avatar Component
 * 3D bird avatar with customizable appearance and flying animation
 * 
 * Birds available:
 * - phoenix: Fiery red/orange plumage (mythical)
 * - eagle: Majestic brown/gold (powerful)
 * - parrot: Vibrant multi-color (playful)
 * - swan: Elegant white/grey (graceful)
 * - owl: Wise brown/tan (intelligent)
 */

const BIRD_STYLES = {
  phoenix: {
    primary: "#FF6B35",
    secondary: "#FFA500",
    accent: "#FFD700",
    name: "Phoenix 🔥",
    wingSpan: "80px",
  },
  eagle: {
    primary: "#8B4513",
    secondary: "#D2691E",
    accent: "#FFD700",
    name: "Eagle 🦅",
    wingSpan: "90px",
  },
  parrot: {
    primary: "#00AA00",
    secondary: "#FF0000",
    accent: "#FFD700",
    name: "Parrot 🦜",
    wingSpan: "70px",
  },
  swan: {
    primary: "#FFFFFF",
    secondary: "#E8E8E8",
    accent: "#FFB6C1",
    name: "Swan 🦢",
    wingSpan: "95px",
  },
  owl: {
    primary: "#8B6F47",
    secondary: "#D4A574",
    accent: "#FFD700",
    name: "Owl 🦉",
    wingSpan: "75px",
  },
};

const VOICE_TYPES = ["soprano", "alto", "tenor", "bass", "robotic", "whimsical"];

export function ZagelAvatar({
  birdType = "phoenix",
  voiceType = "soprano",
  animating = false,
  animationDuration = 2000,
  className = "",
  size = "md",
}) {
  const [isFlying, setIsFlying] = useState(animating);
  const [wingFrame, setWingFrame] = useState(0);
  const containerRef = useRef(null);

  const style = BIRD_STYLES[birdType] || BIRD_STYLES.phoenix;
  const sizeMap = {
    sm: "60px",
    md: "80px",
    lg: "120px",
  };
  const baseSize = sizeMap[size] || sizeMap.md;

  // Wing flapping animation
  useEffect(() => {
    if (!isFlying) return;

    const interval = setInterval(() => {
      setWingFrame((prev) => (prev + 1) % 4);
    }, 100);

    return () => clearInterval(interval);
  }, [isFlying]);

  // Auto-stop animation after duration
  useEffect(() => {
    if (!animating) return;

    setIsFlying(true);
    const timer = setTimeout(() => {
      setIsFlying(false);
    }, animationDuration);

    return () => clearTimeout(timer);
  }, [animating, animationDuration]);

  const wingRotations = [0, 20, -20, 0];
  const wingRotation = wingRotations[wingFrame];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{
        width: baseSize,
        height: baseSize,
      }}
    >
      {/* SVG Bird Avatar */}
      <svg
        viewBox="0 0 100 100"
        style={{
          width: "100%",
          height: "100%",
          filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
        }}
      >
        {/* Body */}
        <ellipse
          cx="50"
          cy="55"
          rx="25"
          ry="30"
          fill={style.primary}
          opacity="0.95"
        />

        {/* Head */}
        <circle cx="50" cy="30" r="18" fill={style.primary} opacity="0.95" />

        {/* Eye */}
        <circle cx="58" cy="26" r="3" fill="#000" />
        <circle cx="59" cy="25" r="1" fill="#FFF" />

        {/* Beak */}
        <polygon
          points="66,30 78,28 66,32"
          fill={style.accent}
          opacity="0.9"
        />

        {/* Tail Feathers */}
        <path
          d="M 25 55 Q 10 50 8 65 Q 10 70 25 65"
          fill={style.secondary}
          opacity="0.85"
        />
        <path
          d="M 25 55 Q 5 45 0 60 Q 5 75 25 70"
          fill={style.primary}
          opacity="0.7"
        />

        {/* Left Wing */}
        <g
          style={{
            transformOrigin: "35px 50px",
            transform: `rotate(${isFlying ? wingRotation : -15}deg)`,
            transition: "transform 0.1s ease-in-out",
          }}
        >
          <ellipse
            cx="35"
            cy="50"
            rx="20"
            ry="12"
            fill={style.secondary}
            opacity="0.8"
          />
          <ellipse
            cx="28"
            cy="48"
            rx="15"
            ry="8"
            fill={style.primary}
            opacity="0.6"
          />
        </g>

        {/* Right Wing */}
        <g
          style={{
            transformOrigin: "65px 50px",
            transform: `rotate(${isFlying ? -wingRotation : 15}deg)`,
            transition: "transform 0.1s ease-in-out",
          }}
        >
          <ellipse
            cx="65"
            cy="50"
            rx="20"
            ry="12"
            fill={style.secondary}
            opacity="0.8"
          />
          <ellipse
            cx="72"
            cy="48"
            rx="15"
            ry="8"
            fill={style.primary}
            opacity="0.6"
          />
        </g>

        {/* Feet */}
        <g opacity="0.7">
          <line x1="45" y1="85" x2="45" y2="92" stroke={style.accent} strokeWidth="2" />
          <line x1="55" y1="85" x2="55" y2="92" stroke={style.accent} strokeWidth="2" />
          <circle cx="45" cy="93" r="2" fill={style.accent} />
          <circle cx="55" cy="93" r="2" fill={style.accent} />
        </g>
      </svg>

      {/* Floating animation for idle state */}
      {!isFlying && (
        <style>{`
          @keyframes float-idle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .zagel-floating {
            animation: float-idle 3s ease-in-out infinite;
          }
        `}</style>
      )}

      {/* Flying animation for active delivery */}
      {isFlying && (
        <style>{`
          @keyframes zagel-fly {
            0% { transform: translateX(-100px) translateY(-50px) scale(0.8); opacity: 0.3; }
            10% { opacity: 0.8; }
            50% { transform: translateX(0px) translateY(-100px) scale(1); opacity: 1; }
            90% { opacity: 0.8; }
            100% { transform: translateX(100px) translateY(-50px) scale(0.8); opacity: 0.3; }
          }
          .zagel-flying {
            animation: zagel-fly ${animationDuration}ms ease-in-out forwards;
          }
        `}</style>
      )}

      {/* Voice indicator */}
      <div
        className={cn(
          "absolute -bottom-3 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r",
          voiceType === "soprano" && "from-pink-500 to-red-500 text-white",
          voiceType === "alto" && "from-purple-500 to-pink-500 text-white",
          voiceType === "tenor" && "from-blue-500 to-purple-500 text-white",
          voiceType === "bass" && "from-amber-600 to-orange-600 text-white",
          voiceType === "robotic" && "from-gray-500 to-slate-600 text-white",
          voiceType === "whimsical" && "from-yellow-400 to-pink-400 text-black"
        )}
        style={{
          fontSize: "10px",
          opacity: isFlying ? 1 : 0.6,
        }}
      >
        {voiceType}
      </div>
    </div>
  );
}

export default ZagelAvatar;
