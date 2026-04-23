import React, { useRef, useEffect } from 'react';

interface ZagelAvatarProps {
  isInitialized: boolean;
  isPulsing: boolean;
  isFlying: boolean;
  onClick: () => void;
}

export const ZagelAvatar: React.FC<ZagelAvatarProps> = ({
  isInitialized,
  isPulsing,
  isFlying,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create SVG pigeon shape (Zagel)
  const pigeon3DShape = () => {
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
        <!-- Body -->
        <ellipse cx="50" cy="55" rx="25" ry="30" fill="#7c8dab" />
        
        <!-- Head -->
        <circle cx="50" cy="25" r="15" fill="#8b9bc3" />
        
        <!-- Eyes -->
        <circle cx="45" cy="22" r="3" fill="#1a1a1a" />
        <circle cx="55" cy="22" r="3" fill="#1a1a1a" />
        <circle cx="46" cy="21" r="1.5" fill="#ffffff" />
        <circle cx="56" cy="21" r="1.5" fill="#ffffff" />
        
        <!-- Beak -->
        <polygon points="60,25 75,23 62,27" fill="#daa520" />
        
        <!-- Wings (folded) -->
        <ellipse cx="38" cy="50" rx="12" ry="18" fill="#6b7a98" transform="rotate(-25 38 50)" />
        <ellipse cx="62" cy="50" rx="12" ry="18" fill="#6b7a98" transform="rotate(25 62 50)" />
        
        <!-- Tail feathers -->
        <polygon points="50,85 45,95 50,92 55,95" fill="#5a6a8a" />
        
        <!-- Feet -->
        <line x1="45" y1="85" x2="45" y2="92" stroke="#d4af37" stroke-width="1.5" />
        <line x1="55" y1="85" x2="55" y2="92" stroke="#d4af37" stroke-width="1.5" />
        <circle cx="45" cy="92" r="2" fill="#d4af37" />
        <circle cx="55" cy="92" r="2" fill="#d4af37" />
        
        <!-- Glow effect when active -->
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    `;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Create and style the avatar container
    const style = containerRef.current.style;
    
    if (isPulsing) {
      style.animation = 'zagel-pulse 0.6s ease-in-out forwards';
    } else if (isFlying) {
      style.animation = 'zagel-fly 3s ease-in-out forwards';
    } else if (isInitialized) {
      style.animation = 'none';
      style.transform = 'translateY(-10px)';
    } else {
      style.animation = 'zagel-float 3s ease-in-out infinite';
    }
  }, [isPulsing, isFlying, isInitialized]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`
        relative cursor-pointer transition-all duration-300
        ${isPulsing ? 'scale-110' : 'hover:scale-105'}
      `}
      style={{
        width: '120px',
        height: '120px',
      }}
    >
      {/* Circular frame */}
      <div
        className={`
          absolute inset-0 rounded-full border-4 flex items-center justify-center
          transition-all duration-300
          ${isPulsing ? 'border-warning' : isInitialized ? 'border-success' : 'border-primary'}
          ${isPulsing ? 'shadow-[0_0_20px_rgba(251,191,36,0.8)]' : ''}
        `}
        style={{
          background: 'linear-gradient(135deg, rgba(124,141,171,0.1), rgba(100,120,160,0.1))',
        }}
      >
        {/* SVG Pigeon inside */}
        <div
          className="w-20 h-20"
          dangerouslySetInnerHTML={{ __html: pigeon3DShape() }}
        />
      </div>

      {/* Pulse ring animation */}
      {isPulsing && (
        <div
          className="absolute inset-0 rounded-full border-4 border-warning"
          style={{
            animation: 'zagel-pulse-ring 1s ease-out forwards',
            opacity: 0.5,
          }}
        />
      )}

      {/* Flying indicator */}
      {isFlying && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-2xl animate-bounce">
          ✈️
        </div>
      )}

      {/* Status indicator */}
      <div
        className={`
          absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-base-100
          ${isInitialized ? 'bg-success' : 'bg-warning'}
          ${isPulsing ? 'animate-pulse' : ''}
        `}
      />

      {/* CSS animations */}
      <style>{`
        @keyframes zagel-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes zagel-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        
        @keyframes zagel-pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 0 0 15px rgba(251, 191, 36, 0);
            transform: scale(1.3);
          }
        }
        
        @keyframes zagel-fly {
          0% {
            transform: translateY(0px) translateX(0px);
            opacity: 1;
          }
          50% {
            transform: translateY(-200px) translateX(50px);
          }
          100% {
            transform: translateY(-400px) translateX(0px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
