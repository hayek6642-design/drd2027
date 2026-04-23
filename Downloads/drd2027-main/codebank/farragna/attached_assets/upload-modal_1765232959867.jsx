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
exports.UploadModal = UploadModal;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const checkbox_1 = require("@/components/ui/checkbox");
const progress_1 = require("@/components/ui/progress");
const select_1 = require("@/components/ui/select");
const dialog_1 = require("@/components/ui/dialog");
const utils_1 = require("@/lib/utils");
const schema_1 = require("@shared/schema");
function UploadModal({ isOpen, onClose, onUpload }) {
    const [file, setFile] = (0, react_1.useState)(null);
    const [caption, setCaption] = (0, react_1.useState)("");
    const [category, setCategory] = (0, react_1.useState)("entertainment");
    const [copyrightAgreed, setCopyrightAgreed] = (0, react_1.useState)(false);
    const [responsibilityAgreed, setResponsibilityAgreed] = (0, react_1.useState)(false);
    const [isDragging, setIsDragging] = (0, react_1.useState)(false);
    const [uploadProgress, setUploadProgress] = (0, react_1.useState)(0);
    const [isUploading, setIsUploading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const fileInputRef = (0, react_1.useRef)(null);
    const canUpload = file && copyrightAgreed && responsibilityAgreed && !isUploading;
    const handleDragOver = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    const handleDrop = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith("video/")) {
            setFile(droppedFile);
            setError(null);
        }
        else {
            setError("Please upload a video file");
        }
    }, []);
    const handleFileSelect = (0, react_1.useCallback)((e) => {
        var _a;
        const selectedFile = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (selectedFile && selectedFile.type.startsWith("video/")) {
            setFile(selectedFile);
            setError(null);
        }
        else {
            setError("Please upload a video file");
        }
    }, []);
    const handleUpload = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        if (!file || !canUpload)
            return;
        setIsUploading(true);
        setError(null);
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);
        try {
            yield onUpload(file, caption, category);
            setUploadProgress(100);
            setTimeout(() => {
                onClose();
                resetForm();
            }, 500);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        }
        finally {
            clearInterval(progressInterval);
            setIsUploading(false);
        }
    }), [file, caption, category, canUpload, onUpload, onClose]);
    const resetForm = (0, react_1.useCallback)(() => {
        setFile(null);
        setCaption("");
        setCategory("entertainment");
        setCopyrightAgreed(false);
        setResponsibilityAgreed(false);
        setUploadProgress(0);
        setError(null);
    }, []);
    const handleClose = (0, react_1.useCallback)(() => {
        if (!isUploading) {
            onClose();
            resetForm();
        }
    }, [isUploading, onClose, resetForm]);
    return (<dialog_1.Dialog open={isOpen} onOpenChange={handleClose}>
      <dialog_1.DialogContent className="sm:max-w-md">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="text-xl font-bold">Upload Video</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Share your video with the Farragna community
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="space-y-4">
          <div className={(0, utils_1.cn)("relative border-2 border-dashed rounded-lg min-h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-200", isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50", file && "border-green-500 bg-green-500/5")} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }}>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" data-testid="input-video-file"/>

            {file ? (<div className="text-center p-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                  <lucide_react_1.Check className="w-8 h-8 text-green-500"/>
                </div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button_1.Button variant="ghost" size="sm" className="mt-2" onClick={(e) => {
                e.stopPropagation();
                setFile(null);
            }}>
                  <lucide_react_1.X className="w-4 h-4 mr-1"/> Remove
                </button_1.Button>
              </div>) : (<div className="text-center p-4">
                <lucide_react_1.Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground"/>
                <p className="font-medium text-foreground">
                  Drop your video here or click to browse
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP4, WebM, MOV (Max 500MB)
                </p>
              </div>)}
          </div>

          {error && (<div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <lucide_react_1.AlertCircle className="w-4 h-4 flex-shrink-0"/>
              <span>{error}</span>
            </div>)}

          <div className="space-y-2">
            <label_1.Label htmlFor="caption">Caption</label_1.Label>
            <input_1.Input id="caption" placeholder="Describe your video..." value={caption} onChange={(e) => setCaption(e.target.value)} disabled={isUploading} data-testid="input-caption"/>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="category">Category</label_1.Label>
            <select_1.Select value={category} onValueChange={setCategory} disabled={isUploading}>
              <select_1.SelectTrigger data-testid="select-category">
                <select_1.SelectValue placeholder="Select category"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {schema_1.CATEGORIES.map((cat) => (<select_1.SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <checkbox_1.Checkbox id="copyright" checked={copyrightAgreed} onCheckedChange={(checked) => setCopyrightAgreed(checked === true)} disabled={isUploading} data-testid="checkbox-copyright"/>
              <label_1.Label htmlFor="copyright" className="text-sm leading-relaxed cursor-pointer">
                I confirm this video doesn't violate copyright laws
              </label_1.Label>
            </div>

            <div className="flex items-start gap-3">
              <checkbox_1.Checkbox id="responsibility" checked={responsibilityAgreed} onCheckedChange={(checked) => setResponsibilityAgreed(checked === true)} disabled={isUploading} data-testid="checkbox-responsibility"/>
              <label_1.Label htmlFor="responsibility" className="text-sm leading-relaxed cursor-pointer">
                I take full responsibility for the content uploaded
              </label_1.Label>
            </div>
          </div>

          {isUploading && (<div className="space-y-2">
              <progress_1.Progress value={uploadProgress} className="h-2"/>
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>)}

          <div className="flex gap-3">
            <button_1.Button variant="outline" className="flex-1" onClick={handleClose} disabled={isUploading} data-testid="button-cancel-upload">
              Cancel
            </button_1.Button>
            <button_1.Button className="flex-1" onClick={handleUpload} disabled={!canUpload} data-testid="button-confirm-upload">
              {isUploading ? (<>
                  <lucide_react_1.Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                  Uploading
                </>) : (<>
                  <lucide_react_1.Upload className="w-4 h-4 mr-2"/>
                  Upload
                </>)}
            </button_1.Button>
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
exports.default = UploadModal;
