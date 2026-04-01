import { useState, useCallback, useEffect } from "react";
import { Heart, Flame, Crown, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EngagementButtons({
  videoId,
  initialLikes,
  initialSuperLikes,
  initialMegaLikes,
  onEngagement,
  className,
}) {
  const [activeEngagement, setActiveEngagement] = useState(null);
  const [counts, setCounts] = useState({
    likes: initialLikes,
    superLikes: initialSuperLikes,
    megaLikes: initialMegaLikes,
  });
  const [animating, setAnimating] = useState(null);
  const [floatingNumbers, setFloatingNumbers] = useState([]);

  const handleEngagement = useCallback((type) => {
    setAnimating(type);
    
    if (activeEngagement === type) {
      setActiveEngagement(null);
      setCounts((prev) => ({
        ...prev,
        [type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"]:
          prev[type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"] - 1,
      }));
    } else {
      if (activeEngagement) {
        setCounts((prev) => ({
          ...prev,
          [activeEngagement === "like" ? "likes" : activeEngagement === "superLike" ? "superLikes" : "megaLikes"]:
            prev[activeEngagement === "like" ? "likes" : activeEngagement === "superLike" ? "superLikes" : "megaLikes"] - 1,
        }));
      }
      setActiveEngagement(type);
      setCounts((prev) => ({
        ...prev,
        [type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"]:
          prev[type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"] + 1,
      }));
    }

    onEngagement?.(type, videoId);
    
    setTimeout(() => setAnimating(null), 600);
  }, [activeEngagement, videoId, onEngagement]);

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <EngagementButton
        icon={Heart}
        count={counts.likes}
        isActive={activeEngagement === "like"}
        isAnimating={animating === "like"}
        onClick={() => handleEngagement("like")}
        activeColor="text-primary"
        animationClass="animate-pulse-heart"
        label="Like"
        formatCount={formatCount}
        testId={`button-like-${videoId}`}
      />
      
      <EngagementButton
        icon={Flame}
        count={counts.superLikes}
        isActive={activeEngagement === "superLike"}
        isAnimating={animating === "superLike"}
        onClick={() => handleEngagement("superLike")}
        activeColor="text-orange-500"
        animationClass="animate-fire-burst"
        label="Super Like"
        formatCount={formatCount}
        testId={`button-superlike-${videoId}`}
      />
      
      <div className="relative">
        <EngagementButton
          icon={Crown}
          count={counts.megaLikes}
          isActive={activeEngagement === "megaLike"}
          isAnimating={animating === "megaLike"}
          onClick={() => handleEngagement("megaLike")}
          activeColor="text-accent"
          animationClass="animate-crown-explosion"
          label="Mega Like"
          formatCount={formatCount}
          testId={`button-megalike-${videoId}`}
        />
        {animating === "megaLike" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-accent animate-ring-expand" />
          </div>
        )}
      </div>

      <ActionButton
        icon={MessageCircle}
        label="Comments"
        testId={`button-comment-${videoId}`}
        onClick={() => {}}
      />
      
      <ActionButton
        icon={Share2}
        label="Share"
        testId={`button-share-${videoId}`}
        onClick={() => {}}
      />
    </div>
  );
}

function EngagementButton({
  icon: Icon,
  count,
  isActive,
  isAnimating,
  onClick,
  activeColor,
  animationClass,
  label,
  formatCount,
  testId,
}) {
  const getAnimationClass = () => {
    if (!isAnimating) return "";
    switch (label.toLowerCase()) {
      case "like": return "animate-like-pop";
      case "super like": return "animate-super-like-pop";
      case "mega like": return "animate-mega-like-pop";
      default: return "animate-like-pop";
    }
  };

  const getGlowClass = () => {
    if (!isActive) return "";
    if (label.toLowerCase().includes("super")) return "animate-glow-orange";
    if (label.toLowerCase().includes("mega")) return "animate-glow-violet";
    return "";
  };

  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="flex flex-col items-center gap-1 group relative"
      aria-label={label}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-300",
          "hover:bg-black/60 hover:scale-110 active:scale-95",
          "border border-white/10 hover:border-white/20",
          isActive && "bg-black/60 border-white/20",
          getGlowClass()
        )}
      >
        <Icon
          className={cn(
            "w-6 h-6 transition-all duration-300",
            isActive ? activeColor : "text-white",
            isActive && "fill-current drop-shadow-lg",
            getAnimationClass()
          )}
        />
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-transparent via-transparent to-white/5 animate-shimmer" />
        )}
      </div>
      <span
        className={cn(
          "text-xs font-semibold text-white/90 transition-all duration-200",
          "drop-shadow-sm",
          isAnimating && "animate-count-pop text-white scale-110"
        )}
      >
        {formatCount(count)}
      </span>
      {isAnimating && (
        <div className="absolute -top-2 -right-2 w-2 h-2 bg-primary rounded-full animate-ping" />
      )}
    </button>
  );
}

function ActionButton({ icon: Icon, label, testId, onClick }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      aria-label={label}
    >
      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:bg-black/60 hover:scale-110">
        <Icon className="w-6 h-6 text-white" />
      </div>
    </button>
  );
}