import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Pause, Play, RotateCcw, Mic, Send } from "lucide-react";
export function VoiceRecorder({ onCancel, onSend }) {
    const [isRecording, setIsRecording] = useState(true);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [previewProgress, setPreviewProgress] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationRef = useRef(null);
    const audioRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setIsPreviewing(true);
                stream.getTracks().forEach((track) => track.stop());
            };
            mediaRecorder.start(100);
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
            drawWaveform();
        }
        catch (error) {
            console.error("Error accessing microphone:", error);
            onCancel();
        }
    }, [onCancel]);
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, [isRecording]);
    const drawWaveform = useCallback(() => {
        if (!canvasRef.current || !analyserRef.current)
            return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const computedStyle = getComputedStyle(document.documentElement);
        const primaryColor = computedStyle.getPropertyValue("--primary").trim();
        const mutedColor = computedStyle.getPropertyValue("--muted").trim();
        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            ctx.fillStyle = mutedColor ? `hsl(${mutedColor})` : "#1a1a1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            const primaryHsl = primaryColor ? `hsl(${primaryColor})` : "#3b82f6";
            const primaryHslAlpha = primaryColor ? `hsl(${primaryColor} / 0.5)` : "rgba(59, 130, 246, 0.5)";
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, primaryHsl);
                gradient.addColorStop(1, primaryHslAlpha);
                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 1, barHeight);
                x += barWidth;
            }
        };
        draw();
    }, []);
    const handlePlayPreview = useCallback(() => {
        if (!audioBlob)
            return;
        if (!audioRef.current) {
            audioRef.current = new Audio(URL.createObjectURL(audioBlob));
            audioRef.current.onended = () => {
                setIsPlaying(false);
                setPreviewProgress(0);
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                }
            };
        }
        if (isPlaying) {
            audioRef.current.pause();
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        }
        else {
            audioRef.current.play();
            progressIntervalRef.current = setInterval(() => {
                if (audioRef.current) {
                    setPreviewProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }
            }, 100);
        }
        setIsPlaying(!isPlaying);
    }, [audioBlob, isPlaying]);
    const handleReRecord = useCallback(() => {
        stopAll();
        startRecording();
    }, [startRecording]);
    const handleSend = useCallback(() => {
        if (audioBlob) {
            onSend(audioBlob);
        }
    }, [audioBlob, onSend]);
    const stopAll = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    }, [isRecording]);
    useEffect(() => {
        return () => {
            stopAll();
        };
    }, [startRecording]);
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };
    return (<div className="border-t bg-background p-4">
      <div className="flex items-center gap-4">
        <Button size="icon" variant="ghost" onClick={() => {
            stopAll();
            onCancel();
        }} className="text-destructive" data-testid="button-cancel-recording">
          <X className="h-5 w-5"/>
        </Button>

        <div className="flex-1">
          {!isPreviewing ? (<div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full bg-destructive", isRecording && "animate-pulse")}/>
                <span className="text-sm font-medium tabular-nums">
                  {formatDuration(duration)}
                </span>
              </div>
              <canvas ref={canvasRef} width={200} height={40} className="flex-1 rounded-md"/>
            </div>) : (<div className="flex items-center gap-4">
              <Button size="icon" variant="ghost" onClick={handlePlayPreview} data-testid="button-play-preview">
                {isPlaying ? (<Pause className="h-5 w-5"/>) : (<Play className="h-5 w-5 ml-0.5"/>)}
              </Button>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-100" style={{ width: `${previewProgress}%` }}/>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatDuration(duration)}
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={handleReRecord} data-testid="button-rerecord">
                <RotateCcw className="h-4 w-4"/>
              </Button>
            </div>)}
        </div>

        {!isPreviewing ? (<Button size="icon" onClick={stopRecording} className="bg-destructive hover:bg-destructive/90" data-testid="button-stop-recording">
            <Mic className="h-5 w-5"/>
          </Button>) : (<Button size="icon" onClick={handleSend} data-testid="button-send-voice">
            <Send className="h-5 w-5"/>
          </Button>)}
      </div>
    </div>);
}
export default VoiceRecorder;
