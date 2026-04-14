import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ZagelAvatar } from './components/ZagelAvatar';
import { ToastNotification } from './components/ToastNotification';
import { VoiceListener } from './components/VoiceListener';
import { AudioSystem } from './utils/audioSystem';
import { TriggerListener } from './utils/triggerListener';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'automation';
}

interface AvatarState {
  isInitialized: boolean;
  isFlying: boolean;
  currentPage: 'codebank' | 'main';
  hasNotification: boolean;
  pulseActive: boolean;
}

const App: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [avatarState, setAvatarState] = useState<AvatarState>({
    isInitialized: false,
    isFlying: false,
    currentPage: 'codebank',
    hasNotification: false,
    pulseActive: false,
  });

  const audioSystemRef = useRef<AudioSystem | null>(null);
  const triggerListenerRef = useRef<TriggerListener | null>(null);

  // Initialize systems
  useEffect(() => {
    audioSystemRef.current = new AudioSystem();
    triggerListenerRef.current = new TriggerListener((update) => {
      handleTriggerUpdate(update);
    });

    return () => {
      audioSystemRef.current?.cleanup();
      triggerListenerRef.current?.cleanup();
    };
  }, []);

  const handleTriggerUpdate = (update: {
    type: 'message' | 'video' | 'product' | 'news' | 'code' | 'other';
    title: string;
    description: string;
  }) => {
    setAvatarState((prev) => ({
      ...prev,
      hasNotification: true,
    }));

    const toastId = Date.now().toString();
    addToast(
      `📬 New ${update.type}: ${update.title}`,
      'info',
      toastId,
    );

    // If app is backgrounded, play door knock sound
    if (!document.hasFocus()) {
      audioSystemRef.current?.playDoorKnock();
    }
  };

  const handleAvatarClick = () => {
    // Pulse animation
    setAvatarState((prev) => ({
      ...prev,
      pulseActive: true,
    }));

    // Show toast
    const toastId = Date.now().toString();
    addToast('🤖 The system is about to be automated...', 'automation', toastId);

    // After animation, initialize
    setTimeout(() => {
      setAvatarState((prev) => ({
        ...prev,
        pulseActive: false,
        isInitialized: true,
      }));

      audioSystemRef.current?.playActivationSound();
      
      // Zagel introduction
      setTimeout(() => {
        const introId = Date.now().toString();
        addToast(
          '🕊️ Zagel: My dear, I have been initialized. I will monitor your updates and notify you across all pages!',
          'success',
          introId,
        );
      }, 500);
    }, 2000);
  };

  const handleFlyToPage = (page: 'main') => {
    setAvatarState((prev) => ({
      ...prev,
      isFlying: true,
      currentPage: page,
    }));

    setTimeout(() => {
      setAvatarState((prev) => ({
        ...prev,
        isFlying: false,
      }));
    }, 3000);
  };

  const addToast = (message: string, type: Toast['type'], id: string) => {
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleVoiceCommand = (command: string) => {
    if (command.toLowerCase().includes('yes zagel') || 
        command.toLowerCase().includes('come in')) {
      
      // Launch app
      setAvatarState((prev) => ({
        ...prev,
        isInitialized: true,
      }));

      audioSystemRef.current?.playAppLaunchSound();

      const toastId = Date.now().toString();
      addToast(
        '🕊️ Zagel: Welcome back! I have ' +
        avatarState.hasNotification ? '5 new updates' : 'no pending updates' +
        ' for you.',
        'success',
        toastId,
      );
    }
  };

  return (
    <div className="w-full h-full bg-base-100 flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center">
        {!avatarState.isInitialized ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-base-content">
              Welcome to Code Bank
            </h1>
            <p className="text-base-content/60">
              Click the Zagel avatar below to initialize automation
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-base-content">
              🕊️ Zagel Automation Active
            </h1>
            <p className="text-base-content/60">
              Zagel is monitoring your updates across all pages
            </p>
            {avatarState.hasNotification && (
              <button
                onClick={() => handleFlyToPage('main')}
                className="btn btn-primary"
              >
                Show Updates ({avatarState.hasNotification ? '📬' : '✓'})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zagel Avatar - Bottom Center */}
      <div className="flex justify-center pb-8">
        <ZagelAvatar
          isInitialized={avatarState.isInitialized}
          isPulsing={avatarState.pulseActive}
          isFlying={avatarState.isFlying}
          onClick={handleAvatarClick}
        />
      </div>

      {/* Toast notifications - centered */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 space-y-3">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
          />
        ))}
      </div>

      {/* Voice listener for "yes Zagel, come in" */}
      {!avatarState.isInitialized && (
        <VoiceListener onCommand={handleVoiceCommand} />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
