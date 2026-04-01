import { Heart, Play, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Video, Favorite } from "@shared/schema";

interface FavoritesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesModal({ open, onOpenChange }: FavoritesModalProps) {
  const { data: favoritesData = [], isLoading, isError } = useQuery<(Favorite & { video?: Video })[]>({
    queryKey: ["/api/favorites"],
    enabled: open,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest("DELETE", `/api/videos/${videoId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const favorites = (favoritesData || []).map((f) => f?.video).filter(Boolean) as Video[];

  const handleRemove = (videoId: number) => {
    removeFavoriteMutation.mutate(videoId);
  };

  const handlePlay = (videoId: number) => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Heart className="w-5 h-5 text-primary fill-primary" />
            Favorites
          </DialogTitle>
          <DialogDescription>
            Your liked videos collection
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Failed to load favorites.</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/favorites"] })} data-testid="button-retry-favorites">
              Try Again
            </Button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No favorites yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Videos you like will appear here. Start exploring and add some favorites!
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {favorites.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  data-testid={`favorite-item-${video.id}`}
                >
                  <div className="relative w-24 h-14 rounded-md overflow-hidden bg-black flex-shrink-0">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.caption || "Video thumbnail"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/60" />
                      </div>
                    )}
                    <button
                      onClick={() => handlePlay(video.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-play-favorite-${video.id}`}
                    >
                      <Play className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {video.caption || "Untitled video"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{video.views?.toLocaleString() || 0} views</span>
                      <span className="text-muted-foreground/50">-</span>
                      <span>{video.category || "entertainment"}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(video.id)}
                    disabled={removeFavoriteMutation.isPending}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    data-testid={`button-remove-favorite-${video.id}`}
                  >
                    {removeFavoriteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
