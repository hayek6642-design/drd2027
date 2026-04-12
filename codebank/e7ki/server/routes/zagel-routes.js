/**
 * ZAGEL Routes
 * Backend API endpoints for 3D avatar bird messaging with vocal delivery
 * 
 * Endpoints:
 * - POST   /api/e7ki/zagel/avatar/init      - Initialize ZAGEL avatar
 * - GET    /api/e7ki/zagel/avatar/:userId    - Get user's avatar settings
 * - PUT    /api/e7ki/zagel/avatar/:userId    - Update avatar settings
 * - POST   /api/e7ki/zagel/delivery          - Track voice message delivery
 * - GET    /api/e7ki/zagel/deliveries/:conversationId - Get delivery history
 * - POST   /api/e7ki/zagel/vocal-play        - Mark vocal message as played
 */

import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// In-memory storage (for demo; use database in production)
const zagelAvatars = new Map();
const zagelDeliveries = new Map();

/**
 * POST /api/e7ki/zagel/avatar/init
 * Initialize ZAGEL avatar for user
 */
router.post("/avatar/init", (req, res) => {
  try {
    const { userId, birdType = "phoenix", voiceType = "soprano" } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const avatarId = uuidv4();
    const avatarData = {
      id: avatarId,
      userId,
      birdType,
      voiceType,
      enableVocalNotifications: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDeliveries: 0,
      totalVocalPlaybacks: 0,
    };

    zagelAvatars.set(userId, avatarData);

    return res.status(201).json({
      success: true,
      avatar: avatarData,
      message: "ZAGEL avatar initialized",
    });
  } catch (error) {
    console.error("Error initializing avatar:", error);
    return res.status(500).json({ error: "Failed to initialize avatar" });
  }
});

/**
 * GET /api/e7ki/zagel/avatar/:userId
 * Get user's ZAGEL avatar settings
 */
router.get("/avatar/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    // Get existing avatar or create default
    let avatar = zagelAvatars.get(userId);

    if (!avatar) {
      avatar = {
        id: uuidv4(),
        userId,
        birdType: "phoenix",
        voiceType: "soprano",
        enableVocalNotifications: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDeliveries: 0,
        totalVocalPlaybacks: 0,
      };
      zagelAvatars.set(userId, avatar);
    }

    return res.status(200).json({
      success: true,
      avatar,
    });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return res.status(500).json({ error: "Failed to fetch avatar" });
  }
});

/**
 * PUT /api/e7ki/zagel/avatar/:userId
 * Update user's ZAGEL avatar settings
 */
router.put("/avatar/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { birdType, voiceType, enableVocalNotifications } = req.body;

    let avatar = zagelAvatars.get(userId);

    if (!avatar) {
      avatar = {
        id: uuidv4(),
        userId,
        birdType: "phoenix",
        voiceType: "soprano",
        enableVocalNotifications: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDeliveries: 0,
        totalVocalPlaybacks: 0,
      };
    }

    // Update fields if provided
    if (birdType) avatar.birdType = birdType;
    if (voiceType) avatar.voiceType = voiceType;
    if (enableVocalNotifications !== undefined) {
      avatar.enableVocalNotifications = enableVocalNotifications;
    }

    avatar.updatedAt = new Date().toISOString();
    zagelAvatars.set(userId, avatar);

    return res.status(200).json({
      success: true,
      avatar,
      message: "Avatar settings updated",
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return res.status(500).json({ error: "Failed to update avatar" });
  }
});

/**
 * POST /api/e7ki/zagel/delivery
 * Track voice message delivery with bird animation
 */
router.post("/delivery", (req, res) => {
  try {
    const {
      messageId,
      conversationId,
      senderId,
      senderName,
      recipientId,
      recipientName,
      birdType = "phoenix",
      voiceType = "soprano",
      audioUrl,
    } = req.body;

    if (!messageId || !conversationId || !senderId || !recipientId) {
      return res.status(400).json({
        error: "messageId, conversationId, senderId, and recipientId are required",
      });
    }

    const deliveryId = uuidv4();
    const deliveryData = {
      id: deliveryId,
      messageId,
      conversationId,
      senderId,
      senderName,
      recipientId,
      recipientName,
      birdType,
      voiceType,
      audioUrl,
      status: "delivering", // delivering, delivered, played
      deliveryStartedAt: new Date().toISOString(),
      deliveryCompletedAt: null,
      vocalPlayedAt: null,
      isVocalDelivery: true,
    };

    zagelDeliveries.set(deliveryId, deliveryData);

    // Update avatar stats
    const senderAvatar = zagelAvatars.get(senderId);
    if (senderAvatar) {
      senderAvatar.totalDeliveries = (senderAvatar.totalDeliveries || 0) + 1;
    }

    return res.status(201).json({
      success: true,
      delivery: deliveryData,
      message: "Delivery tracking started",
    });
  } catch (error) {
    console.error("Error tracking delivery:", error);
    return res.status(500).json({ error: "Failed to track delivery" });
  }
});

/**
 * POST /api/e7ki/zagel/delivery/:deliveryId/complete
 * Mark delivery as completed
 */
router.post("/delivery/:deliveryId/complete", (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = zagelDeliveries.get(deliveryId);

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    delivery.status = "delivered";
    delivery.deliveryCompletedAt = new Date().toISOString();

    return res.status(200).json({
      success: true,
      delivery,
      message: "Delivery marked as completed",
    });
  } catch (error) {
    console.error("Error completing delivery:", error);
    return res.status(500).json({ error: "Failed to complete delivery" });
  }
});

/**
 * GET /api/e7ki/zagel/deliveries/:conversationId
 * Get delivery history for a conversation
 */
router.get("/deliveries/:conversationId", (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversationDeliveries = Array.from(zagelDeliveries.values()).filter(
      (d) => d.conversationId === conversationId
    );

    return res.status(200).json({
      success: true,
      count: conversationDeliveries.length,
      deliveries: conversationDeliveries,
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return res.status(500).json({ error: "Failed to fetch deliveries" });
  }
});

/**
 * POST /api/e7ki/zagel/vocal-play/:deliveryId
 * Mark vocal message as played
 */
router.post("/vocal-play/:deliveryId", (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = zagelDeliveries.get(deliveryId);

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    delivery.status = "played";
    delivery.vocalPlayedAt = new Date().toISOString();

    // Update recipient avatar stats
    const recipientAvatar = zagelAvatars.get(delivery.recipientId);
    if (recipientAvatar) {
      recipientAvatar.totalVocalPlaybacks =
        (recipientAvatar.totalVocalPlaybacks || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      delivery,
      message: "Vocal delivery marked as played",
    });
  } catch (error) {
    console.error("Error marking vocal as played:", error);
    return res.status(500).json({ error: "Failed to mark vocal as played" });
  }
});

/**
 * GET /api/e7ki/zagel/stats/:userId
 * Get user's ZAGEL statistics
 */
router.get("/stats/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    const avatar = zagelAvatars.get(userId);

    if (!avatar) {
      return res.status(404).json({ error: "User avatar not found" });
    }

    const userDeliveries = Array.from(zagelDeliveries.values()).filter(
      (d) => d.senderId === userId || d.recipientId === userId
    );

    const stats = {
      userId,
      totalDeliveries: avatar.totalDeliveries || 0,
      totalVocalPlaybacks: avatar.totalVocalPlaybacks || 0,
      messagesReceived: userDeliveries.filter((d) => d.recipientId === userId)
        .length,
      messagesSent: userDeliveries.filter((d) => d.senderId === userId).length,
      avatar,
    };

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
