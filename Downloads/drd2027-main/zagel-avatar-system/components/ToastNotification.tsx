import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'warning' | 'automation';
}

export const ToastNotification: React.FC<ToastProps> = ({ message, type }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success',
          icon: '✅',
          textColor: 'text-success-content',
        };
      case 'warning':
        return {
          bg: 'bg-warning',
          icon: '⚠️',
          textColor: 'text-warning-content',
        };
      case 'automation':
        return {
          bg: 'bg-info',
          icon: '🤖',
          textColor: 'text-info-content',
        };
      default:
        return {
          bg: 'bg-info',
          icon: 'ℹ️',
          textColor: 'text-info-content',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        transform transition-all duration-300
        ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
      `}
    >
      <div
        className={`
          ${styles.bg} ${styles.textColor}
          rounded-lg shadow-lg px-6 py-4 max-w-md
          border border-current border-opacity-30
          backdrop-blur-sm
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{styles.icon}</span>
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};
