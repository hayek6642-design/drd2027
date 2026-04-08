"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesModal = FavoritesModal;
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const scroll_area_1 = require("@/components/ui/scroll-area");
function FavoritesModal({ isOpen, onClose, favorites, onRemove, onPlay, }) {
    return (<dialog_1.Dialog open={isOpen} onOpenChange={onClose}>
      <dialog_1.DialogContent className="sm:max-w-lg">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <lucide_react_1.Heart className="w-5 h-5 text-primary fill-primary"/>
            Favorites
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Your liked videos collection
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        {favorites.length === 0 ? (<div className="py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <lucide_react_1.Heart className="w-10 h-10 text-muted-foreground"/>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No favorites yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Videos you like will appear here. Start exploring and add some favorites!
            </p>
          </div>) : (<scroll_area_1.ScrollArea className="max-h-96">
            <div className="space-y-3">
              {favorites.map((video) => {
                var _a;
                return (<div key={video.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid={`favorite-item-${video.id}`}>
                  <div className="relative w-24 h-14 rounded-md overflow-hidden bg-black flex-shrink-0">
                    {video.thumbnailUrl ? (<img src={video.thumbnailUrl} alt={video.caption || "Video thumbnail"} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center">
                        <lucide_react_1.Play className="w-6 h-6 text-white/60"/>
                      </div>)}
                    <button onClick={() => onPlay(video.id)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-play-favorite-${video.id}`}>
                      <lucide_react_1.Play className="w-6 h-6 text-white"/>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {video.caption || "Untitled video"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{((_a = video.views) === null || _a === void 0 ? void 0 : _a.toLocaleString()) || 0} views</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{video.category || "entertainment"}</span>
                    </div>
                  </div>

                  <button_1.Button variant="ghost" size="icon" onClick={() => onRemove(video.id)} className="flex-shrink-0 text-muted-foreground hover:text-destructive" data-testid={`button-remove-favorite-${video.id}`}>
                    <lucide_react_1.Trash2 className="w-4 h-4"/>
                  </button_1.Button>
                </div>);
            })}
            </div>
          </scroll_area_1.ScrollArea>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
