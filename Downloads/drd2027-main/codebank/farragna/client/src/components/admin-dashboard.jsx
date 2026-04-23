import { useState, useCallback } from "react";
import { Shield, Check, X, Trash2, Search, Filter, Loader2, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Video, ModerationStatus } from "@shared/schema";

interface AdminDashboardProps {
  onBack: () => void;
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [filter, setFilter] = useState<"all" | ModerationStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: videos = [], isLoading, isError } = useQuery<Video[]>({
    queryKey: ["/api/videos/pending"],
    enabled: isAuthenticated,
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ videoId, status }: { videoId: number; status: ModerationStatus }) => {
      await apiRequest("PATCH", `/api/videos/${videoId}/moderate`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest("DELETE", `/api/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
  });

  const handleLogin = useCallback(() => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Invalid password");
    }
  }, [password]);

  const handleAction = useCallback(async (
    action: "approve" | "reject" | "delete",
    videoId: number
  ) => {
    if (action === "approve") {
      moderateMutation.mutate({ videoId, status: "approved" });
    } else if (action === "reject") {
      moderateMutation.mutate({ videoId, status: "rejected" });
    } else {
      deleteMutation.mutate(videoId);
    }
  }, [moderateMutation, deleteMutation]);

  const filteredVideos = videos.filter((video) => {
    const matchesFilter = filter === "all" || video.moderationStatus === filter;
    const matchesSearch = !searchQuery || 
      video.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: videos.length,
    approved: videos.filter((v) => v.moderationStatus === "approved").length,
    review: videos.filter((v) => v.moderationStatus === "review_required").length,
    rejected: videos.filter((v) => v.moderationStatus === "rejected").length,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Review</Badge>;
    }
  };

  const actionLoading = moderateMutation.isPending || deleteMutation.isPending;
  const loadingVideoId = moderateMutation.variables?.videoId || deleteMutation.variables;

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xs w-full space-y-6">
          <Button variant="ghost" onClick={onBack} className="mb-4" data-testid="button-admin-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">Admin Access Required</h3>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                data-testid="input-admin-password"
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
            <Button onClick={handleLogin} className="w-full" data-testid="button-admin-login">
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-admin-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Approved" value={stats.approved} className="border-green-500/30" />
        <StatCard label="Review" value={stats.review} className="border-yellow-500/30" />
        <StatCard label="Rejected" value={stats.rejected} className="border-destructive/30" />
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-admin-search"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40" data-testid="select-admin-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="review_required">Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Failed to load videos.</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/videos/pending"] })} data-testid="button-retry-admin">
              Try Again
            </Button>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No videos found
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden" data-testid={`admin-video-${video.id}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-32 h-20 rounded-md overflow-hidden bg-black flex-shrink-0">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.caption || "Video"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={video.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">
                          {video.caption || "Untitled video"}
                        </p>
                        {getStatusBadge(video.moderationStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>{video.views || 0} views</span>
                        <span>{video.likes || 0} likes</span>
                        <span>{video.category || "entertainment"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAction("approve", video.id)}
                        disabled={actionLoading || video.moderationStatus === "approved"}
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        data-testid={`button-approve-${video.id}`}
                      >
                        {actionLoading && loadingVideoId === video.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAction("reject", video.id)}
                        disabled={actionLoading || video.moderationStatus === "rejected"}
                        className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                        data-testid={`button-reject-${video.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAction("delete", video.id)}
                        disabled={actionLoading}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`button-delete-${video.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
