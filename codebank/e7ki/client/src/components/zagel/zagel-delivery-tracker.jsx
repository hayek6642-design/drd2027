import { useState, useEffect, useRef } from "react";
import { useChat } from "@/lib/chat-context";
import { ZagelAvatar } from "./zagel-avatar";
import { cn } from "@/lib/utils";

/**
 * ZAGEL Delivery Tracker
 * Displays animated bird flying from sender to recipient during voice message delivery
 * Integrates with WebSocket for real-time delivery tracking
 */

export function ZagelDeliveryTracker({
  messageId,
  conversationId,
  senderId,
  senderName,
  recipientId,
  recipientName,
  birdType = "phoenix",
  voiceType = "soprano",
  onDeliveryComplete,
  autoPlay = true,
}) {
  const { ws } = useChat();
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const [isVocalPlaying, setIsVocalPlaying] = useState(false);
  const trackerRef = useRef(null);
  const deliveryTimerRef = useRef(null);

  // Start delivery animation when component mounts
  useEffect(() => {
    if (!autoPlay) return;

    setIsDelivering(true);
    setDeliveryProgress(0);

    // Simulate delivery progress
    let progress = 0;
    deliveryTimerRef.current = setInterval(() => {
      progress += Math.random() * 30; // Random progress chunks
      if (progress >= 100) {
        progress = 100;
        setDeliveryProgress(100);
        completeDelivery();
      } else {
        setDeliveryProgress(progress);
      }
    }, 300);

    return () => {
      if (deliveryTimerRef.current) {
        clearInterval(deliveryTimerRef.current);
      }
    };
  }, [autoPlay, messageId]);

  const completeDelivery = () => {
    setIsDelivering(false);

    // Notify backend of delivery completion
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "zagel_delivery_complete",
          payload: {
            messageId,
            conversationId,
            senderId,
            recipientId,
            completedAt: new Date().toISOString(),
          },
        })
      );
    }

    if (onDeliveryComplete) {
      onDeliveryComplete({
        messageId,
        senderId,
        recipientId,
      });
    }
  };

  // Play vocal notification when delivery is complete
  useEffect(() => {
    if (deliveryProgress === 100 && !isVocalPlaying) {
      playVocalNotification();
    }
  }, [deliveryProgress, isVocalPlaying]);

  const playVocalNotification = async () => {
    if (!isVocalPlaying) {
      setIsVocalPlaying(true);

      try {
        // Use Web Speech API for voice notification
        const utterance = new SpeechSynthesisUtterance(
          `Message from ${senderName}`
        );

        // Map voice types to speech synthesis parameters
        const voiceMap = {
          soprano: { pitch: 1.5, rate: 1.2 },
          alto: { pitch: 1.2, rate: 1.0 },
          tenor: { pitch: 0.8, rate: 0.9 },
          bass: { pitch: 0.5, rate: 0.8 },
          robotic: { pitch: 1.0, rate: 1.5 },
          whimsical: { pitch: 1.3, rate: 1.1 },
        };

        const voiceParams = voiceMap[voiceType] || voiceMap.soprano;
        utterance.pitch = voiceParams.pitch;
        utterance.rate = voiceParams.rate;
        utterance.volume = 0.8;

        utterance.onend = () => {
          setIsVocalPlaying(false);
        };

        utterance.onerror = () => {
          setIsVocalPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Error playing vocal notification:", error);
        setIsVocalPlaying(false);
      }
    }
  };

  const stopDelivery = () => {
    if (deliveryTimerRef.current) {
      clearInterval(deliveryTimerRef.current);
    }
    setIsDelivering(false);
    window.speechSynthesis.cancel();
    setIsVocalPlaying(false);
  };

  return (
    <div
      ref={trackerRef}
      className="relative w-full bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 shadow-sm"
    >
      {/* Delivery Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            🦅 ZAGEL Vocal Delivery
          </span>
          {isDelivering && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-xs font-semibold text-gray-600">
          {Math.round(deliveryProgress)}%
        </span>
      </div>

      {/* Sender -> Recipient */}
      <div className="text-xs text-center text-gray-600 mb-3">
        <span className="font-medium">{senderName}</span>
        <span className="mx-2">→</span>
        <span className="font-medium">{recipientName}</span>
      </div>

      {/* Flying Bird Animation Container */}
      <div className="relative w-full h-24 bg-white bg-opacity-50 rounded-lg overflow-hidden mb-3 border border-blue-100">
        {/* Grid background for perspective */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Sender position (left) */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
          <div className="text-xs font-semibold text-gray-600 mb-1">Sender</div>
          <ZagelAvatar
            birdType={birdType}
            voiceType={voiceType}
            animating={false}
            size="sm"
          />
        </div>

        {/* Flying bird (center) */}
        {isDelivering && (
          <div
            className="absolute top-1/2 transform -translate-y-1/2"
            style={{
              left: `${20 + (deliveryProgress / 100) * 60}%`,
              transition: "left 0.3s ease-out",
            }}
          >
            <ZagelAvatar
              birdType={birdType}
              voiceType={voiceType}
              animating={true}
              animationDuration={3000}
              size="md"
            />
          </div>
        )}

        {/* Recipient position (right) */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
          <div className="text-xs font-semibold text-gray-600 mb-1">Recipient</div>
          <ZagelAvatar
            birdType={birdType}
            voiceType={voiceType}
            animating={deliveryProgress >= 90}
            size="sm"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            deliveryProgress < 50
              ? "bg-blue-500"
              : deliveryProgress < 90
                ? "bg-purple-500"
                : "bg-green-500"
          )}
          style={{ width: `${deliveryProgress}%` }}
        />
      </div>

      {/* Status Text and Controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-700">
          {isDelivering ? (
            <span>
              Delivering...
              {isVocalPlaying && (
                <span className="ml-2 text-purple-600 font-semibold">
                  🔊 Playing vocal notification
                </span>
              )}
            </span>
          ) : deliveryProgress === 100 ? (
            <span className="text-green-600 font-semibold">
              ✅ Delivered & Announced!
            </span>
          ) : (
            <span>Pending delivery...</span>
          )}
        </div>

        {isDelivering && (
          <button
            onClick={stopDelivery}
            className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {/* Delivery Details */}
      <div className="mt-3 pt-3 border-t border-blue-100 text-xs text-gray-600 space-y-1">
        <div>
          <span className="font-medium">Message ID:</span>{" "}
          <code className="bg-gray-200 px-1 rounded text-xs">{messageId.slice(0, 8)}...</code>
        </div>
        <div>
          <span className="font-medium">Bird Type:</span> {birdType}
        </div>
        <div>
          <span className="font-medium">Voice Type:</span> {voiceType}
        </div>
      </div>
    </div>
  );
}

export default ZagelDeliveryTracker;
