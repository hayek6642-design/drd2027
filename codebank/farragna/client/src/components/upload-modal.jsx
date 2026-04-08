import { useState, useCallback, useRef } from "react";
import { Upload, Link as LinkIcon, AlertCircle, Loader2, FileVideo, X, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [uploadMode, setUploadMode] = useState<"url" | "file" | "import">("file");
  const [videoUrl, setVideoUrl] = useState("");
  const [importUrls, setImportUrls] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("entertainment");
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL-based upload mutation
  const urlUploadMutation = useMutation({
    mutationFn: async (data: { videoUrl: string; thumbnailUrl?: string; caption: string; category: string; copyrightConsent: boolean; responsibilityConsent: boolean }) => {
      console.log("[FRONTEND] Attempting URL upload with data:", data);
      try {
        const response = await apiRequest("POST", "/api/videos", data);
        console.log("[FRONTEND] URL upload successful response:", response);
        return response;
      } catch (err) {
        console.error("[FRONTEND] URL upload request failed:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      console.error("[FRONTEND] URL upload mutation error details:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  // Import Samples mutation
  const importSamplesMutation = useMutation({
    mutationFn: async (data: { urls: string[]; category: string }) => {
      return await apiRequest("POST", "/api/videos/import-samples", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Import failed");
    },
  });

  // File-based upload mutation (NO AUTH REQUIRED)
  const fileUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // ⚡ No auth headers needed - guest upload
      const response = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.message || `Upload failed (${response.status})`;
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      console.error("Upload error:", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
    },
  });

  const isPending = urlUploadMutation.isPending || fileUploadMutation.isPending || importSamplesMutation.isPending;
  
  const canUpload = uploadMode === "url" 
    ? (videoUrl && copyrightAgreed && responsibilityAgreed && !isPending)
    : uploadMode === "import"
    ? (importUrls.trim() && copyrightAgreed && responsibilityAgreed && !isPending)
    : (videoFile && copyrightAgreed && responsibilityAgreed && !isPending);

  const handleUpload = useCallback(() => {
    if (!canUpload) return;
    setError(null);
    
    if (uploadMode === "url") {
      urlUploadMutation.mutate({
        videoUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        caption,
        category,
        copyrightConsent: copyrightAgreed,
        responsibilityConsent: responsibilityAgreed,
      });
    } else if (uploadMode === "import") {
      const urls = importUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
      importSamplesMutation.mutate({
        urls,
        category,
      });
    } else if (videoFile) {
      console.log("[FRONTEND] Starting file upload for:", videoFile.name);
      const formData = new FormData();
      formData.append("video", videoFile); // ⚡ MUST match upload.single("video") on backend
      formData.append("caption", caption || videoFile.name);
      formData.append("category", category);
      formData.append("copyrightConsent", String(copyrightAgreed));
      formData.append("responsibilityConsent", String(responsibilityAgreed));
      if (thumbnailUrl) {
        formData.append("thumbnailUrl", thumbnailUrl);
      }
      fileUploadMutation.mutate(formData);
    }
  }, [uploadMode, videoUrl, importUrls, videoFile, thumbnailUrl, caption, category, copyrightAgreed, responsibilityAgreed, canUpload, urlUploadMutation, fileUploadMutation, importSamplesMutation]);

  const resetForm = useCallback(() => {
    setVideoUrl("");
    setImportUrls("");
    setVideoFile(null);
    setThumbnailUrl("");
    setCaption("");
    setCategory("entertainment");
    setCopyrightAgreed(false);
    setResponsibilityAgreed(false);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!isPending) {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }
  }, [isPending, onOpenChange, resetForm]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.");
        return;
      }
      // Validate file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        setError("File too large. Maximum size is 500MB.");
        return;
      }
      setError(null);
      setVideoFile(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.");
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError("File too large. Maximum size is 500MB.");
        return;
      }
      setError(null);
      setVideoFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Video</DialogTitle>
          <DialogDescription>
            Share your video with the Farragna community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "url" | "file" | "import")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" disabled={isPending} data-testid="tab-file-upload">
                <FileVideo className="w-4 h-4 mr-2" />
                File
              </TabsTrigger>
              <TabsTrigger value="url" disabled={isPending} data-testid="tab-url-upload">
                <LinkIcon className="w-4 h-4 mr-2" />
                URL
              </TabsTrigger>
              <TabsTrigger value="import" disabled={isPending} data-testid="tab-import-samples">
                <Download className="w-4 h-4 mr-2" />
                Import
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="space-y-2 mt-4 min-h-[180px]">
              <Label>Video File</Label>
              {!videoFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover-elevate transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 group"
                  data-testid="dropzone-video"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-primary group-hover:animate-bounce" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Drop your video here</p>
                    <p className="text-xs text-muted-foreground mb-3">or click to browse files</p>
                    <p className="text-xs text-muted-foreground/70">MP4, WebM, MOV, AVI • Max 500MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isPending}
                    data-testid="input-video-file"
                  />
                </div>
              ) : (
                <div className="relative p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate" data-testid="text-file-name">{videoFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(videoFile.size)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={clearFile}
                      disabled={isPending}
                      className="hover:bg-destructive/10 hover:text-destructive"
                      data-testid="button-clear-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!canUpload}
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg"
                      data-testid="button-upload-inline-file"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Video
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4 mt-4 min-h-[180px]">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="videoUrl"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={isPending}
                    className="pl-10"
                    data-testid="input-video-url"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct link to your video file (MP4, WebM, etc.)
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                className="w-full"
                data-testid="button-upload-inline-url"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit URL
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="import" className="space-y-4 mt-4 min-h-[180px]">
              <div className="space-y-2">
                <Label htmlFor="importUrls">Freemium Platform Sample URLs</Label>
                <Textarea
                  id="importUrls"
                  placeholder="Paste direct video URLs here (one per line)...&#10;https://example.com/sample1.mp4&#10;https://example.com/sample2.mp4"
                  value={importUrls}
                  onChange={(e) => setImportUrls(e.target.value)}
                  disabled={isPending}
                  className="min-h-[120px] font-mono text-xs"
                  data-testid="textarea-import-urls"
                />
                <p className="text-xs text-muted-foreground">
                  Enter multiple direct video links to manifest them as samples in the feed.
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                className="w-full"
                data-testid="button-import-samples"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Samples
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="thumbnailUrl"
              placeholder="https://example.com/thumbnail.jpg"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              disabled={isPending}
              data-testid="input-thumbnail-url"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span data-testid="text-upload-error">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              placeholder="Describe your video..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isPending}
              data-testid="input-caption"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isPending}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Legal Consent Required</p>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="copyright"
                checked={copyrightAgreed}
                onCheckedChange={(checked) => setCopyrightAgreed(checked === true)}
                disabled={isPending}
                data-testid="checkbox-copyright"
              />
              <Label htmlFor="copyright" className="text-sm leading-relaxed cursor-pointer">
                I confirm this video doesn't violate copyright laws and I grant full rights to publish on YouTube
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="responsibility"
                checked={responsibilityAgreed}
                onCheckedChange={(checked) => setResponsibilityAgreed(checked === true)}
                disabled={isPending}
                data-testid="checkbox-responsibility"
              />
              <Label htmlFor="responsibility" className="text-sm leading-relaxed cursor-pointer">
                I take full responsibility for the content uploaded and any monetization proceeds belong to Farragna
              </Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isPending}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}