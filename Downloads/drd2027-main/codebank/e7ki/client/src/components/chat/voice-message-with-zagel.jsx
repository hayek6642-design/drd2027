import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { useZagel } from "@/lib/zagel-context";
import { VoiceRecorder } from "./voice-recorder";
import { ZagelDeliveryTracker } from "./zagel-delivery-tracker";
import { Button } from "@/components/ui/button";
import { Mic, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

/**
 * Voice Message with ZAGEL Integration
 * Combines voice recording with 3D bird avatar delivery animation
 */

export function VoiceMessageWithZagel({ activeChat, onClose }) {
  const { sendMessage, activeChat: chatContext } = useChat();
  const { userAvatar, startDelivery, completeDelivery } = useZagel();
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [showRecorder, setShowRecorder] = useState(true);
  const [recipientInfo, setRecipientInfo] = useState(null);

  // Get recipient info from chat
  useEffect(() => {
    if (activeChat?.participants) {
      const recipients = activeChat.participants.filter(
        (p) => p.id !== activeChat.currentUserId
      );
      if (recipients.length > 0) {
        setRecipientInfo(recipients[0]);
      }
    }
  }, [activeChat]);

  const handleVoiceRecordingComplete = async (audioBlob, duration) => {
    setRecordedAudio({ blob: audioBlob, duration });

    // Upload audio and send voice message with ZAGEL delivery
    await sendVoiceMessageWithZagel(audioBlob, duration);
  };

  const sendVoiceMessageWithZagel = async (audioBlob, duration) => {
    if (!activeChat || !recipientInfo) return;

    try {
      setIsDelivering(true);
      const messageId = uuidv4();
      setCurrentMessageId(messageId);

      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const audioData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      // Upload audio file (send as base64)
      const uploadResponse = await fetch("/api/e7ki/upload-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: activeChat.id,
          audioData: audioData,
          audioFormat: "wav",
          duration
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }

      const { audioUrl } = await uploadResponse.json();

      // Start ZAGEL delivery tracking
      const deliveryResponse = await fetch("/api/e7ki/zagel/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          conversationId: activeChat.id,
          senderId: activeChat.currentUserId,
          senderName: activeChat.currentUserName || "You",
          recipientId: recipientInfo.id,
          recipientName: recipientInfo.name,
          birdType: userAvatar.birdType,
          voiceType: userAvatar.voiceType,
          audioUrl,
        }),
      });

      if (!deliveryResponse.ok) {
        throw new Error("Failed to start ZAGEL delivery");
      }

      const deliveryData = await deliveryResponse.json();

      // Track delivery in context
      startDelivery(messageId, {
        conversationId: activeChat.id,
        senderId: activeChat.currentUserId,
        recipientId: recipientInfo.id,
        birdType: userAvatar.birdType,
        voiceType: userAvatar.voiceType,
      });

      // Send message through chat system
      await sendMessage({
        text: "",
        type: "voice",
        messageId,
        audioUrl,
        duration,
        voiceData: {
          birdType: userAvatar.birdType,
          voiceType: userAvatar.voiceType,
          deliveryId: deliveryData.delivery?.id,
        },
      });

      // Keep delivery animation visible for its duration
      setTimeout(() => {
        setIsDelivering(false);
        completeDelivery(messageId);
        setShowRecorder(false);
      }, userAvatar.deliveryAnimationDuration || 2000);
    } catch (error) {
      console.error("Error sending voice message with ZAGEL:", error);
      setIsDelivering(false);
    }
  };

  const handleCancel = () => {
    setShowRecorder(false);
    setRecordedAudio(null);
    setCurrentMessageId(null);
    if (onClose) onClose();
  };

  return (
    <div className="w-full space-y-4">
      {/* Show recorder if we haven't sent yet */}
      {showRecorder && !isDelivering && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <VoiceRecorder
            onCancel={handleCancel}
            onSend={handleVoiceRecordingComplete}
          />
        </div>
      )}

      {/* Show ZAGEL delivery tracker during delivery */}
      {isDelivering && currentMessageId && recipientInfo && (
        <ZagelDeliveryTracker
          messageId={currentMessageId}
          conversationId={activeChat?.id}
          senderId={activeChat?.currentUserId}
          senderName={activeChat?.currentUserName || "You"}
          recipientId={recipientInfo.id}
          recipientName={recipientInfo.name}
          birdType={userAvatar.birdType}
          voiceType={userAvatar.voiceType}
          autoPlay={true}
          onDeliveryComplete={() => {
            setIsDelivering(false);
          }}
        />
      )}

      {/* Success message */}
      {!showRecorder && !isDelivering && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-green-700 font-semibold mb-2">
            ✅ Voice message delivered!
          </div>
          <p className="text-sm text-green-600 mb-3">
            Your {userAvatar.birdType} avatar delivered your message vocally to{" "}
            {recipientInfo?.name}
          </p>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

export default VoiceMessageWithZagel;
