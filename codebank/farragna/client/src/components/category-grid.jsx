import { Grid, Play, Film, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import type { Video, Category } from "@shared/schema";
import { CATEGORIES } from "@shared/schema";

interface CategoryGridProps {
  onCategorySelect: (category: Category) => void;
  className?: string;
}

export function CategoryGrid({ onCategorySelect, className }: CategoryGridProps) {
  const { data: videos = [], isLoading, isError } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const categoryData = CATEGORIES.map((category) => {
    const categoryVideos = videos.filter((v) => v.category === category);
    const featuredVideo = categoryVideos[0];
    return {
      name: category as Category,
      count: categoryVideos.length,
      featuredVideo,
    };
  }).filter((c) => c.count > 0);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load categories.</p>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/videos"] })} data-testid="button-retry-categories">
          Try Again
        </Button>
      </div>
    );
  }

  if (categoryData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Grid className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No categories yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Upload videos to see them organized by category
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <Grid className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Browse Categories</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categoryData.map((category) => (
          <Card
            key={category.name}
            className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2"
            onClick={() => onCategorySelect(category.name)}
            data-testid={`category-card-${category.name}`}
          >
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black overflow-hidden">
                {category.featuredVideo?.thumbnailUrl ? (
                  <img
                    src={category.featuredVideo.thumbnailUrl}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : category.featuredVideo?.videoUrl ? (
                  <video
                    src={category.featuredVideo.videoUrl}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-white/40" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm" variant="secondary">
                  {category.count} video{category.count !== 1 ? "s" : ""}
                </Badge>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {category.name}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
