/**
 * Zagel Main Page - Central OS interface with 3D avatar and voice interaction
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ZagelAvatar from "../modules/avatar/ZagelAvatar";
import memoryManager, { type ZagelMemory } from "../modules/memory/memoryManager";
import voiceEngine from "../modules/voice/voiceEngine";
import behaviorEngine, { type Mood } from "../modules/behavior/behaviorEngine";
import automationEngine from "../modules/automation/automationEngine";
import onboardingEngine, { type OnboardingStepData } from "../modules/onboarding/onboardingEngine";
import zagelBridge, { type ServiceName } from "../modules/integration/zagelBridge";

interface ChatMessage {
  id: string;
  role: "user" | "zagel";
  content: string;
  timestamp: Date;
  mood?: Mood;
}

type AppState = "idle" | "listening" | "thinking" | "talking" | "onboarding";

export default function ZagelMain() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [currentMood, setCurrentMood] = useState<Mood>("neutral");
  const [moodColor, setMoodColor] = useState("#7c9cbf");
  const [memory, setMemory] = useState<ZagelMemory>(memoryManager.get());
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStepData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [activeService, setActiveService] = useState<ServiceName | null>(null);
  const [showServices, setShowServices] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Subscribe to memory changes
    const unsub = memoryManager.subscribe((m) => setMemory(m));
    // Load from server
    memoryManager.loadFromServer();

    // Subscribe to bridge events
    const unsubBridge = zagelBridge.subscribe((service, data) => {
      const d = data as { action: string; url?: string };
      if (d.action === "open") {
        setActiveService(service);
        showToast(`Opening ${zagelBridge.getServiceConfig(service)?.displayName}...`);
      }
    });

    // Load voices
    voiceEngine.loadVoices();

    // Set voice callbacks
    voiceEngine.setSpeakCallbacks(
      () => setAppState("talking"),
      () => {
        setAppState("idle");
      }
    );

    return () => {
      unsub();
      unsubBridge();
    };
  }, []);

  useEffect(() => {
    // Start onboarding if not done
    if (!memoryManager.isOnboarded() && messages.length === 0) {
      setTimeout(() => startOnboarding(), 1200);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addMessage = (role: "user" | "zagel", content: string, mood?: Mood) => {
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      role,
      content,
      timestamp: new Date(),
      mood,
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const speakAndAnimate = async (text: string, mood: Mood = "neutral") => {
    setCurrentMood(mood);
    setMoodColor(behaviorEngine.getMoodColor(mood));
    await voiceEngine.speak(text, { rate: 1.0, pitch: 1.1 });
  };

  const startOnboarding = () => {
    setAppState("onboarding");
    onboardingEngine.start({
      onStep: async (step) => {
        setOnboardingStep(step);
        addMessage("zagel", step.zagelMessage, "neutral");
        await speakAndAnimate(step.zagelMessage, "neutral");

        // Auto-start listening after speak
        if (!step.isFinal && !step.expectYesNo) {
          setTimeout(() => startListeningForOnboarding(step), 600);
        } else if (!step.isFinal && step.expectYesNo) {
          setTimeout(() => startListeningForOnboarding(step), 600);
        }
      },
      onComplete: () => {
        setOnboardingStep(null);
        setAppState("idle");
        const name = memoryManager.get().name;
        const welcome = `Welcome${name ? `, ${name}` : ""}! I am ready to help you. Just tap the circle to talk to me.`;
        addMessage("zagel", welcome, "happy");
        speakAndAnimate(welcome, "happy");
      },
    });
  };

  const startListeningForOnboarding = (step: OnboardingStepData) => {
    setAppState("listening");
    voiceEngine.startListening(
      (text, isFinal) => {
        setTranscript(isFinal ? "" : text);
      },
      (finalText) => {
        setTranscript("");
        if (finalText.trim()) {
          addMessage("user", finalText);
          onboardingEngine.handleAnswer(finalText);
        } else {
          setAppState("onboarding");
        }
      },
      () => {
        setAppState("onboarding");
      }
    );
  };

  const streamZagelResponse = async (userMessage: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setAppState("thinking");

    const mem = memoryManager.get();

    try {
      const response = await fetch("/api/zagel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          userId: mem.userId,
          context: "chat",
          memory: {
            name: mem.name,
            job: mem.job,
            interests: mem.interests,
            mood: mem.mood,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let mood: Mood = "neutral";

      // Add empty zagel message to stream into
      const msgId = Math.random().toString(36).slice(2);
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: "zagel", content: "", timestamp: new Date(), mood: "neutral" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, content: fullContent } : m
                )
              );
            }
            if (data.done) {
              mood = (data.mood as Mood) || behaviorEngine.detectMoodFromText(fullContent);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, mood } : m
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Check automation
      const actions = automationEngine.matchRules(userMessage + " " + fullContent);
      for (const action of actions) {
        if (action.type === "open_service") {
          zagelBridge.openService(action.service as ServiceName);
        }
      }

      // Speak the response
      behaviorEngine.setMood(mood);
      await speakAndAnimate(fullContent, mood);
    } catch {
      const errMsg = "I had trouble connecting. Please try again.";
      addMessage("zagel", errMsg, "empathetic");
      await speakAndAnimate(errMsg, "empathetic");
    } finally {
      isProcessingRef.current = false;
      setAppState("idle");
    }
  };

  const handleZagelButtonPress = useCallback(() => {
    if (appState === "listening") {
      voiceEngine.stopListening();
      setAppState("idle");
      return;
    }

    if (appState === "talking") {
      voiceEngine.stopSpeaking();
      setAppState("idle");
      return;
    }

    if (appState !== "idle") return;

    voiceEngine.vibrate(80);
    showToast("Zagel is waking up...");

    setAppState("listening");
    voiceEngine.startListening(
      (text, isFinal) => {
        setTranscript(isFinal ? "" : text);
      },
      (finalText) => {
        setTranscript("");
        if (finalText.trim()) {
          addMessage("user", finalText);
          streamZagelResponse(finalText);
        } else {
          setAppState("idle");
          showToast("I did not catch that. Try again.");
        }
      },
      (err) => {
        setAppState("idle");
        showToast(err);
      }
    );
  }, [appState]);

  const handleTextSend = () => {
    const msg = textInput.trim();
    if (!msg || appState !== "idle") return;
    setTextInput("");
    addMessage("user", msg);
    streamZagelResponse(msg);
  };

  const avatarMoodMap: Record<Mood, "idle" | "talking" | "happy" | "dance" | "gentle" | "focus" | "excited"> = {
    neutral: "idle",
    happy: "happy",
    playful: "dance",
    serious: "focus",
    empathetic: "gentle",
    excited: "excited",
  };

  const avatarMood = appState === "talking"
    ? "talking"
    : appState === "listening"
    ? "idle"
    : avatarMoodMap[currentMood] || "idle";

  const services = zagelBridge.getAllServices();

  return (
    <div className="zagel-app">
      {/* Background */}
      <div className="zagel-bg" />

      {/* Toast */}
      {toast && (
        <div className="zagel-toast">
          {toast}
        </div>
      )}

      {/* Service Panel */}
      {activeService && (
        <div className="zagel-service-panel">
          <div className="zagel-service-header">
            <span>{zagelBridge.getServiceConfig(activeService)?.displayName}</span>
            <button onClick={() => setActiveService(null)} className="zagel-service-close">✕</button>
          </div>
          <iframe
            src={zagelBridge.getServiceConfig(activeService)?.url}
            className="zagel-service-iframe"
            title={activeService}
          />
        </div>
      )}

      <div className="zagel-layout">
        {/* Left: Avatar + Controls */}
        <div className="zagel-sidebar">
          {/* Avatar */}
          <div className="zagel-avatar-wrap">
            <ZagelAvatar
              mood={avatarMood}
              moodColor={moodColor}
              isListening={appState === "listening"}
              isTalking={appState === "talking"}
              size={240}
            />

            {/* Status ring */}
            <div
              className={`zagel-status-ring ${appState}`}
              style={{ borderColor: moodColor }}
            />
          </div>

          {/* Zagel name + status */}
          <div className="zagel-identity">
            <div className="zagel-name">Zagel</div>
            <div className="zagel-status-text">
              {appState === "idle" && (memory.name ? `Hello, ${memory.name}` : "Tap to speak")}
              {appState === "listening" && "Listening..."}
              {appState === "thinking" && "Thinking..."}
              {appState === "talking" && "Speaking..."}
              {appState === "onboarding" && "Getting to know you..."}
            </div>
          </div>

          {/* Live transcript */}
          {transcript && (
            <div className="zagel-transcript">{transcript}</div>
          )}

          {/* Main Zagel Button */}
          <button
            className={`zagel-button ${appState}`}
            onClick={handleZagelButtonPress}
            style={{ background: `radial-gradient(circle, ${moodColor}cc, ${moodColor}66)` }}
          >
            {appState === "listening" ? (
              <div className="zagel-mic-active">
                <svg viewBox="0 0 24 24" fill="currentColor" className="zagel-icon">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
            ) : appState === "talking" ? (
              <div className="zagel-talking-icon">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className="zagel-wave" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="zagel-icon">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>

          {/* Services */}
          <div className="zagel-services">
            <button
              className="zagel-services-toggle"
              onClick={() => setShowServices(!showServices)}
            >
              Services
            </button>
            {showServices && (
              <div className="zagel-services-grid">
                {services.map((svc) => (
                  <button
                    key={svc.name}
                    className="zagel-service-btn"
                    style={{ borderColor: svc.color }}
                    onClick={() => {
                      zagelBridge.openService(svc.name);
                      setShowServices(false);
                    }}
                  >
                    <span
                      className="zagel-service-dot"
                      style={{ background: svc.color }}
                    />
                    {svc.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="zagel-chat">
          <div className="zagel-chat-header">
            <div className="zagel-chat-title">
              {memory.name ? `Chat with Zagel — ${memory.name}` : "Chat with Zagel"}
            </div>
          </div>

          <div className="zagel-messages">
            {messages.length === 0 && (
              <div className="zagel-empty">
                <div className="zagel-empty-icon">🕊</div>
                <div>Tap the circle to wake Zagel</div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`zagel-msg zagel-msg--${msg.role}`}
                style={
                  msg.role === "zagel" && msg.mood
                    ? { borderLeftColor: behaviorEngine.getMoodColor(msg.mood) }
                    : {}
                }
              >
                {msg.role === "zagel" && (
                  <span className="zagel-msg-label">Zagel</span>
                )}
                <div className="zagel-msg-content">{msg.content}</div>
                <div className="zagel-msg-time">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {appState === "thinking" && (
              <div className="zagel-msg zagel-msg--zagel zagel-thinking">
                <span className="zagel-msg-label">Zagel</span>
                <div className="zagel-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Text input */}
          <div className="zagel-input-row">
            <input
              className="zagel-input"
              placeholder="Type a message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
              disabled={appState !== "idle"}
            />
            <button
              className="zagel-send-btn"
              onClick={handleTextSend}
              disabled={appState !== "idle" || !textInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
