import { useState, useEffect } from "react";
import { useZagel } from "@/lib/zagel-context";
import { useAuth } from "@/lib/auth-context";
import { ZagelAvatar } from "./zagel-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

/**
 * ZAGEL Settings Component
 * Allows users to customize their avatar and voice preferences
 */

const BIRD_OPTIONS = [
  { id: "phoenix", label: "Phoenix 🔥", description: "Fiery and powerful" },
  { id: "eagle", label: "Eagle 🦅", description: "Majestic and strong" },
  { id: "parrot", label: "Parrot 🦜", description: "Playful and colorful" },
  { id: "swan", label: "Swan 🦢", description: "Elegant and graceful" },
  { id: "owl", label: "Owl 🦉", description: "Wise and intelligent" },
];

const VOICE_OPTIONS = [
  { id: "soprano", label: "Soprano", description: "High and bright" },
  { id: "alto", label: "Alto", description: "Medium and warm" },
  { id: "tenor", label: "Tenor", description: "Deep and mellow" },
  { id: "bass", label: "Bass", description: "Very deep and rich" },
  { id: "robotic", label: "Robotic", description: "Futuristic and fast" },
  { id: "whimsical", label: "Whimsical", description: "Playful and unique" },
];

export function ZagelSettings() {
  const { userAvatar, updateAvatarSettings } = useZagel();
  const { user, getAuthHeaders } = useAuth();
  const [selectedBird, setSelectedBird] = useState(userAvatar.birdType);
  const [selectedVoice, setSelectedVoice] = useState(userAvatar.voiceType);
  const [enableVocal, setEnableVocal] = useState(
    userAvatar.enableVocalNotifications
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      if (!user || !user.id) {
        setSaveStatus({
          type: "error",
          message: "Not authenticated - cannot save settings",
        });
        setIsSaving(false);
        return;
      }

      // Update local context
      updateAvatarSettings({
        birdType: selectedBird,
        voiceType: selectedVoice,
        enableVocalNotifications: enableVocal,
      });

      // Sync to backend using auth headers and current user ID
      const response = await fetch(
        `/api/e7ki/zagel/avatar`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            avatar_model: selectedBird,
            voice_type: selectedVoice,
            voice_enabled: enableVocal,
          }),
        }
      );

      if (response.ok) {
        setSaveStatus({ type: "success", message: "Settings saved!" });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({
          type: "error",
          message: "Failed to save settings",
        });
      }
    } catch (error) {
      console.error("Error saving ZAGEL settings:", error);
      setSaveStatus({
        type: "error",
        message: "Error saving settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testVoice = () => {
    const voiceParams = {
      soprano: { pitch: 1.5, rate: 1.2 },
      alto: { pitch: 1.2, rate: 1.0 },
      tenor: { pitch: 0.8, rate: 0.9 },
      bass: { pitch: 0.5, rate: 0.8 },
      robotic: { pitch: 1.0, rate: 1.5 },
      whimsical: { pitch: 1.3, rate: 1.1 },
    };

    const params = voiceParams[selectedVoice] || voiceParams.soprano;
    const utterance = new SpeechSynthesisUtterance(
      `Testing ${selectedVoice} voice with ${selectedBird} bird`
    );

    utterance.pitch = params.pitch;
    utterance.rate = params.rate;
    utterance.volume = 0.8;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🦅 ZAGEL Avatar Settings</h1>
        <p className="text-gray-600">
          Customize your avatar bird and vocal delivery preferences
        </p>
      </div>

      {/* Status Messages */}
      {saveStatus && (
        <div
          className={`p-3 rounded-lg ${
            saveStatus.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      {/* Bird Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Bird Avatar</CardTitle>
          <CardDescription>
            Select which bird represents you in voice deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bird Preview */}
            <div className="flex justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <ZagelAvatar
                birdType={selectedBird}
                voiceType={selectedVoice}
                animating={true}
                size="lg"
              />
            </div>

            {/* Bird Options Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BIRD_OPTIONS.map((bird) => (
                <button
                  key={bird.id}
                  onClick={() => setSelectedBird(bird.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedBird === bird.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="font-semibold">{bird.label}</div>
                  <div className="text-xs text-gray-600">
                    {bird.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Voice</CardTitle>
          <CardDescription>
            Select how ZAGEL announces your messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Voice Type Options Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedVoice === voice.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <div className="font-semibold">{voice.label}</div>
                  <div className="text-xs text-gray-600">
                    {voice.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Test Button */}
            <Button
              onClick={testVoice}
              variant="outline"
              className="w-full"
            >
              🔊 Test Voice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vocal Notifications Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Vocal Notifications</CardTitle>
          <CardDescription>
            Enable audio announcements when receiving voice messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-semibold">Announcement</div>
              <div className="text-sm text-gray-600">
                {enableVocal
                  ? "Enabled - You'll hear voice announcements"
                  : "Disabled - Messages will arrive silently"}
              </div>
            </div>
            <Switch
              checked={enableVocal}
              onCheckedChange={setEnableVocal}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        size="lg"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "💾 Save Settings"
        )}
      </Button>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">About ZAGEL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>
            🦅 <strong>ZAGEL</strong> is your personal avatar messenger bird
            that delivers your voice messages with style and personality.
          </p>
          <p>
            Each message you send via voice will be delivered by your chosen
            bird, flying from you to the recipient with your selected voice type
            announcing the message.
          </p>
          <div className="mt-4 space-y-1 text-xs">
            <p>
              <strong>5 Bird Types:</strong> Phoenix, Eagle, Parrot, Swan, Owl
            </p>
            <p>
              <strong>6 Voice Types:</strong> Soprano, Alto, Tenor, Bass,
              Robotic, Whimsical
            </p>
            <p>
              <strong>Features:</strong> Real-time delivery tracking, animated
              flight path, customizable appearance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your ZAGEL Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userAvatar.totalDeliveries || 0}
              </div>
              <div className="text-xs text-gray-600">Vocal Messages Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userAvatar.totalVocalPlaybacks || 0}
              </div>
              <div className="text-xs text-gray-600">Voices Heard</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ZagelSettings;
