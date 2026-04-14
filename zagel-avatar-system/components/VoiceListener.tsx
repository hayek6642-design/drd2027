import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceListenerProps {
  onCommand: (command: string) => void;
}

export const VoiceListener: React.FC<VoiceListenerProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        checkForCommand(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Restart listening if the app is still in background
      if (!document.hasFocus()) {
        setTimeout(() => {
          recognition.start();
        }, 1000);
      }
    };

    // Start listening
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, []);

  const checkForCommand = (text: string) => {
    const lowerText = text.toLowerCase();

    // Check for activation phrases
    if (
      lowerText.includes('yes zagel') ||
      lowerText.includes('yes zajel') ||
      lowerText.includes('come in') ||
      lowerText.includes('open zagel') ||
      lowerText.includes('activate zagel')
    ) {
      onCommand(text);
      setTranscript('');
    }
  };

  const toggleListening = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40">
      <div className="flex flex-col items-center gap-3">
        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary">
            <div className="flex gap-1">
              <div
                className="w-1 h-3 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0s' }}
              />
              <div
                className="w-1 h-3 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-1 h-3 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <span className="text-xs text-primary font-medium">Listening...</span>
          </div>
        )}

        {/* Transcript display */}
        {transcript && (
          <div className="px-4 py-2 rounded-lg bg-base-200 text-base-content text-sm max-w-xs text-center">
            {transcript}
          </div>
        )}

        {/* Voice control button */}
        <button
          onClick={toggleListening}
          className={`btn btn-circle btn-lg transition-all ${
            isListening ? 'btn-error' : 'btn-primary'
          }`}
          title="Toggle voice recognition"
        >
          {isListening ? (
            <Mic size={24} />
          ) : (
            <MicOff size={24} />
          )}
        </button>

        <p className="text-xs text-base-content/60 text-center max-w-xs">
          Say "yes Zagel, come in" to activate
        </p>
      </div>
    </div>
  );
};
