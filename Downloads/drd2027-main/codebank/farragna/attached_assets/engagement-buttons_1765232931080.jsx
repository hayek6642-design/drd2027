"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementButtons = EngagementButtons;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
function EngagementButtons({ videoId, initialLikes, initialSuperLikes, initialMegaLikes, onEngagement, onToggleFavorite, isFavorite = false, className, }) {
    const [activeEngagement, setActiveEngagement] = (0, react_1.useState)(null);
    const [counts, setCounts] = (0, react_1.useState)({
        likes: initialLikes,
        superLikes: initialSuperLikes,
        megaLikes: initialMegaLikes,
    });
    const [animating, setAnimating] = (0, react_1.useState)(null);
    const handleEngagement = (0, react_1.useCallback)((type) => {
        setAnimating(type);
        if (activeEngagement === type) {
            setActiveEngagement(null);
            setCounts((prev) => (Object.assign(Object.assign({}, prev), { [type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"]: prev[type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"] - 1 })));
        }
        else {
            if (activeEngagement) {
                setCounts((prev) => (Object.assign(Object.assign({}, prev), { [activeEngagement === "like" ? "likes" : activeEngagement === "superLike" ? "superLikes" : "megaLikes"]: prev[activeEngagement === "like" ? "likes" : activeEngagement === "superLike" ? "superLikes" : "megaLikes"] - 1 })));
            }
            setActiveEngagement(type);
            setCounts((prev) => (Object.assign(Object.assign({}, prev), { [type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"]: prev[type === "like" ? "likes" : type === "superLike" ? "superLikes" : "megaLikes"] + 1 })));
        }
        onEngagement === null || onEngagement === void 0 ? void 0 : onEngagement(type, videoId);
        setTimeout(() => setAnimating(null), 600);
    }, [activeEngagement, videoId, onEngagement]);
    const formatCount = (count) => {
        if (count >= 1000000)
            return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000)
            return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };
    return (<div className={(0, utils_1.cn)("flex flex-col items-center gap-5", className)}>
      <EngagementButton icon={lucide_react_1.Heart} count={counts.likes} isActive={activeEngagement === "like"} isAnimating={animating === "like"} onClick={() => handleEngagement("like")} activeColor="text-primary" animationClass="animate-pulse-heart" label="Like" formatCount={formatCount} testId={`button-like-${videoId}`}/>
      
      <EngagementButton icon={lucide_react_1.Flame} count={counts.superLikes} isActive={activeEngagement === "superLike"} isAnimating={animating === "superLike"} onClick={() => handleEngagement("superLike")} activeColor="text-orange-500" animationClass="animate-fire-burst" label="Super Like" formatCount={formatCount} testId={`button-superlike-${videoId}`}/>
      
      <div className="relative">
        <EngagementButton icon={lucide_react_1.Crown} count={counts.megaLikes} isActive={activeEngagement === "megaLike"} isAnimating={animating === "megaLike"} onClick={() => handleEngagement("megaLike")} activeColor="text-yellow-400" animationClass="animate-crown-explosion" label="Mega Like" formatCount={formatCount} testId={`button-megalike-${videoId}`}/>
        {animating === "megaLike" && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-yellow-400 animate-ring-expand"/>
          </div>)}
      </div>

      <ActionButton icon={lucide_react_1.MessageCircle} label="Comments" testId={`button-comment-${videoId}`} onClick={() => { }}/>
      
      <ActionButton icon={lucide_react_1.Share2} label="Share" testId={`button-share-${videoId}`} onClick={() => { }}/>
    </div>);
}
function EngagementButton({ icon: Icon, count, isActive, isAnimating, onClick, activeColor, animationClass, label, formatCount, testId, }) {
    return (<button data-testid={testId} onClick={onClick} className="flex flex-col items-center gap-1 group" aria-label={label}>
      <div className={(0, utils_1.cn)("w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200", "hover:bg-black/60 hover:scale-110", isActive && "bg-black/60")}>
        <Icon className={(0, utils_1.cn)("w-6 h-6 transition-all duration-200", isActive ? activeColor : "text-white", isActive && "fill-current", isAnimating && animationClass)}/>
      </div>
      <span className={(0, utils_1.cn)("text-xs font-medium text-white/90 transition-transform", isAnimating && "animate-count-pop")}>
        {formatCount(count)}
      </span>
    </button>);
}
function ActionButton({ icon: Icon, label, testId, onClick }) {
    return (<button data-testid={testId} onClick={onClick} className="flex flex-col items-center gap-1 group" aria-label={label}>
      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:bg-black/60 hover:scale-110">
        <Icon className="w-6 h-6 text-white"/>
      </div>
    </button>);
}
