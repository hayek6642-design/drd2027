"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDashboard = AdminDashboard;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const dialog_1 = require("@/components/ui/dialog");
const select_1 = require("@/components/ui/select");
const scroll_area_1 = require("@/components/ui/scroll-area");
const card_1 = require("@/components/ui/card");
const utils_1 = require("@/lib/utils");
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";
function AdminDashboard({ isOpen, onClose, videos, onApprove, onReject, onDelete, isLoading, }) {
    const [isAuthenticated, setIsAuthenticated] = (0, react_1.useState)(false);
    const [password, setPassword] = (0, react_1.useState)("");
    const [passwordError, setPasswordError] = (0, react_1.useState)("");
    const [filter, setFilter] = (0, react_1.useState)("all");
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    const [actionLoading, setActionLoading] = (0, react_1.useState)(null);
    const handleLogin = (0, react_1.useCallback)(() => {
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError("");
        }
        else {
            setPasswordError("Invalid password");
        }
    }, [password]);
    const handleClose = (0, react_1.useCallback)(() => {
        setIsAuthenticated(false);
        setPassword("");
        setPasswordError("");
        onClose();
    }, [onClose]);
    const handleAction = (0, react_1.useCallback)((action, videoId) => __awaiter(this, void 0, void 0, function* () {
        setActionLoading(String(videoId));
        try {
            if (action === "approve")
                yield onApprove(videoId);
            else if (action === "reject")
                yield onReject(videoId);
            else
                yield onDelete(videoId);
        }
        finally {
            setActionLoading(null);
        }
    }), [onApprove, onReject, onDelete]);
    const filteredVideos = videos.filter((video) => {
        var _a, _b;
        const matchesFilter = filter === "all" || video.moderationStatus === filter;
        const matchesSearch = !searchQuery ||
            ((_a = video.caption) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchQuery.toLowerCase())) ||
            ((_b = video.category) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });
    const stats = {
        total: videos.length,
        approved: videos.filter((v) => v.moderationStatus === "approved").length,
        review: videos.filter((v) => v.moderationStatus === "review_required").length,
        rejected: videos.filter((v) => v.moderationStatus === "rejected").length,
    };
    const getStatusBadge = (status) => {
        switch (status) {
            case "approved":
                return <badge_1.Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</badge_1.Badge>;
            case "rejected":
                return <badge_1.Badge className="bg-destructive/20 text-destructive border-destructive/30">Rejected</badge_1.Badge>;
            default:
                return <badge_1.Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Review</badge_1.Badge>;
        }
    };
    return (<dialog_1.Dialog open={isOpen} onOpenChange={handleClose}>
      <dialog_1.DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <lucide_react_1.Shield className="w-5 h-5 text-primary"/>
            Admin Dashboard
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Manage and moderate video content
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        {!isAuthenticated ? (<div className="py-8">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <lucide_react_1.Shield className="w-8 h-8 text-primary"/>
              </div>
              <h3 className="text-lg font-medium text-center">Admin Access Required</h3>
              <div className="space-y-2">
                <input_1.Input type="password" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} data-testid="input-admin-password"/>
                {passwordError && (<p className="text-sm text-destructive">{passwordError}</p>)}
              </div>
              <button_1.Button onClick={handleLogin} className="w-full" data-testid="button-admin-login">
                Login
              </button_1.Button>
            </div>
          </div>) : (<div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <StatCard label="Total" value={stats.total}/>
              <StatCard label="Approved" value={stats.approved} className="border-green-500/30"/>
              <StatCard label="Review" value={stats.review} className="border-yellow-500/30"/>
              <StatCard label="Rejected" value={stats.rejected} className="border-destructive/30"/>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <input_1.Input placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-admin-search"/>
              </div>
              <select_1.Select value={filter} onValueChange={(v) => setFilter(v)}>
                <select_1.SelectTrigger className="w-40" data-testid="select-admin-filter">
                  <lucide_react_1.Filter className="w-4 h-4 mr-2"/>
                  <select_1.SelectValue placeholder="Filter"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="all">All</select_1.SelectItem>
                  <select_1.SelectItem value="approved">Approved</select_1.SelectItem>
                  <select_1.SelectItem value="review_required">Review</select_1.SelectItem>
                  <select_1.SelectItem value="rejected">Rejected</select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <scroll_area_1.ScrollArea className="flex-1">
              {isLoading ? (<div className="flex items-center justify-center py-12">
                  <lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/>
                </div>) : filteredVideos.length === 0 ? (<div className="text-center py-12 text-muted-foreground">
                  No videos found
                </div>) : (<div className="grid gap-3">
                  {filteredVideos.map((video) => (<card_1.Card key={video.id} className="overflow-hidden" data-testid={`admin-video-${video.id}`}>
                      <card_1.CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <div className="w-32 h-20 rounded-md overflow-hidden bg-black flex-shrink-0">
                            {video.thumbnailUrl ? (<img src={video.thumbnailUrl} alt={video.caption || "Video"} className="w-full h-full object-cover"/>) : (<video src={video.videoUrl} className="w-full h-full object-cover" muted/>)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium text-foreground truncate">
                                {video.caption || "Untitled video"}
                              </p>
                              {getStatusBadge(video.moderationStatus)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{video.views || 0} views</span>
                              <span>{video.likes || 0} likes</span>
                              <span>{video.category || "entertainment"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button_1.Button variant="ghost" size="icon" onClick={() => handleAction("approve", video.id)} disabled={actionLoading === String(video.id) || video.moderationStatus === "approved"} className="text-green-500 hover:text-green-600 hover:bg-green-500/10" data-testid={`button-approve-${video.id}`}>
                              {actionLoading === String(video.id) ? (<lucide_react_1.Loader2 className="w-4 h-4 animate-spin"/>) : (<lucide_react_1.Check className="w-4 h-4"/>)}
                            </button_1.Button>
                            <button_1.Button variant="ghost" size="icon" onClick={() => handleAction("reject", video.id)} disabled={actionLoading === String(video.id) || video.moderationStatus === "rejected"} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10" data-testid={`button-reject-${video.id}`}>
                              <lucide_react_1.X className="w-4 h-4"/>
                            </button_1.Button>
                            <button_1.Button variant="ghost" size="icon" onClick={() => handleAction("delete", video.id)} disabled={actionLoading === String(video.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10" data-testid={`button-delete-${video.id}`}>
                              <lucide_react_1.Trash2 className="w-4 h-4"/>
                            </button_1.Button>
                          </div>
                        </div>
                      </card_1.CardContent>
                    </card_1.Card>))}
                </div>)}
            </scroll_area_1.ScrollArea>
          </div>)}
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
function StatCard({ label, value, className }) {
    return (<card_1.Card className={(0, utils_1.cn)("border", className)}>
      <card_1.CardContent className="p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </card_1.CardContent>
    </card_1.Card>);
}
