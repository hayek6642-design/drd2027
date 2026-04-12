import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * ZAGEL Context
 * Manages ZAGEL avatar settings, delivery tracking, and vocal notifications
 */

const ZagelContext = createContext(null);

export function ZagelProvider({ children }) {
  const [userAvatar, setUserAvatar] = useState(() => {
    const saved = localStorage.getItem("zagel_avatar_settings");
    return saved
      ? JSON.parse(saved)
      : {
          birdType: "phoenix",
          voiceType: "soprano",
          enableVocalNotifications: true,
          deliveryAnimationDuration: 2000,
        };
  });

  const [deliveries, setDeliveries] = useState(new Map());

  // Save avatar settings to localStorage
  const updateAvatarSettings = useCallback((newSettings) => {
    setUserAvatar((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("zagel_avatar_settings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Track delivery animation
  const startDelivery = useCallback((messageId, deliveryData) => {
    setDeliveries((prev) => new Map(prev).set(messageId, deliveryData));
  }, []);

  // Complete delivery animation
  const completeDelivery = useCallback((messageId) => {
    setDeliveries((prev) => {
      const updated = new Map(prev);
      updated.delete(messageId);
      return updated;
    });
  }, []);

  // Get active deliveries
  const getActiveDeliveries = useCallback(() => {
    return Array.from(deliveries.entries()).map(([messageId, data]) => ({
      messageId,
      ...data,
    }));
  }, [deliveries]);

  const value = {
    userAvatar,
    updateAvatarSettings,
    deliveries,
    startDelivery,
    completeDelivery,
    getActiveDeliveries,
  };

  return (
    <ZagelContext.Provider value={value}>{children}</ZagelContext.Provider>
  );
}

export function useZagel() {
  const context = useContext(ZagelContext);
  if (!context) {
    throw new Error("useZagel must be used within ZagelProvider");
  }
  return context;
}
