import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { VideoFeed } from "@/components/video-feed";
import { CategoryGrid } from "@/components/category-grid";
import { AdminDashboard } from "@/components/admin-dashboard";
import { FavoritesModal } from "@/components/favorites-modal";
import { UploadModal } from "@/components/upload-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Video, Category, EngagementType, Favorite } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [view, setView] = useState<"feed" | "categories" | "admin">("feed");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const queryParams = new URLSearchParams();
  if (selectedCategory) queryParams.set("category", selectedCategory);
  if (searchQuery) queryParams.set("search", searchQuery);
  const queryString = queryParams.toString();
  const videosUrl = queryString ? `/api/videos?${queryString}` : "/api/videos";

  const { data: videos = [], isLoading: isLoadingVideos } = useQuery<Video[]>({
    queryKey: ["/api/videos", selectedCategory, searchQuery],
    queryFn: async () => {
      const response = await fetch(videosUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const { data: favoritesData = [] } = useQuery<(Favorite & { video: Video })[]>({
    queryKey: ["/api/favorites"],
  });

  const favoriteVideoIds = favoritesData.map((f) => f.videoId);

  const engagementMutation = useMutation({
    mutationFn: async ({ type, videoId }: { type: EngagementType; videoId: number }) => {
      await apiRequest("POST", `/api/videos/${videoId}/engagement`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const isFavorite = favoriteVideoIds.includes(videoId);
      if (isFavorite) {
        await apiRequest("DELETE", `/api/videos/${videoId}/favorite`);
      } else {
        await apiRequest("POST", `/api/videos/${videoId}/favorite`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setView("feed");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    setView("feed");
  };

  const handleLogoClick = () => {
    setView("admin");
  };

  const handleBackFromAdmin = () => {
    setView("feed");
  };

  const handleOpenCategories = () => {
    setView("categories");
    setSelectedCategory(null);
  };

  const handleEngagement = (type: EngagementType, videoId: number) => {
    engagementMutation.mutate({ type, videoId });
  };

  const handleToggleFavorite = (videoId: number) => {
    favoriteMutation.mutate(videoId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onUploadClick={() => setShowUpload(true)}
        onFavoritesClick={() => setShowFavorites(true)}
        onSearch={handleSearch}
        onAdminClick={handleLogoClick}
      />

      <main className="flex-1 pt-20 overflow-hidden">
        {view === "admin" ? (
          <AdminDashboard onBack={handleBackFromAdmin} />
        ) : view === "categories" ? (
          <CategoryGrid onCategorySelect={handleCategorySelect} />
        ) : (
          <VideoFeed
            videos={videos}
            onEngagement={handleEngagement}
            onToggleFavorite={handleToggleFavorite}
            favorites={favoriteVideoIds}
          />
        )}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex gap-3">
            <Button onClick={() => setShowUpload(true)} className="rounded-full shadow-lg">
              Upload
            </Button>
            <Button variant="secondary" onClick={() => setView("categories")} className="rounded-full shadow-lg">
              Browse
            </Button>
          </div>
        </div>
      </main>

      <FavoritesModal
        open={showFavorites}
        onOpenChange={setShowFavorites}
      />

      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
      />
    </div>
  );
}
