"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.insertUserSchema = exports.wsMessageSchema = exports.typingIndicatorSchema = exports.userSchema = exports.chatSchema = exports.messageSchema = void 0;
const zod_1 = require("zod");
exports.messageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    chatId: zod_1.z.string(),
    senderId: zod_1.z.string(),
    senderName: zod_1.z.string(),
    type: zod_1.z.enum(["text", "voice", "image", "video", "file"]),
    content: zod_1.z.string(),
    fileName: zod_1.z.string().optional(),
    fileSize: zod_1.z.number().optional(),
    mimeType: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional(),
    replyTo: zod_1.z.string().optional(),
    reactions: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        emoji: zod_1.z.string(),
    })).default([]),
    status: zod_1.z.enum(["sending", "sent", "delivered", "read"]).default("sending"),
    timestamp: zod_1.z.number(),
    ttl: zod_1.z.number().optional(),
    expiresAt: zod_1.z.number().optional(),
});
exports.chatSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    isGroup: zod_1.z.boolean().default(false),
    avatar: zod_1.z.string().optional(),
    participants: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string(),
        avatar: zod_1.z.string().optional(),
        isOnline: zod_1.z.boolean().default(false),
        lastSeen: zod_1.z.number().optional(),
    })),
    lastMessage: exports.messageSchema.optional(),
    unreadCount: zod_1.z.number().default(0),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
});
exports.userSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    avatar: zod_1.z.string().optional(),
    isOnline: zod_1.z.boolean().default(false),
    lastSeen: zod_1.z.number().optional(),
});
exports.typingIndicatorSchema = zod_1.z.object({
    chatId: zod_1.z.string(),
    userId: zod_1.z.string(),
    userName: zod_1.z.string(),
    isTyping: zod_1.z.boolean(),
});
exports.wsMessageSchema = zod_1.z.discriminatedUnion("type", [
    zod_1.z.object({
        type: zod_1.z.literal("message"),
        payload: exports.messageSchema,
    }),
    zod_1.z.object({
        type: zod_1.z.literal("typing"),
        payload: exports.typingIndicatorSchema,
    }),
    zod_1.z.object({
        type: zod_1.z.literal("read"),
        payload: zod_1.z.object({
            chatId: zod_1.z.string(),
            messageId: zod_1.z.string(),
            userId: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        type: zod_1.z.literal("reaction"),
        payload: zod_1.z.object({
            messageId: zod_1.z.string(),
            userId: zod_1.z.string(),
            emoji: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        type: zod_1.z.literal("delete"),
        payload: zod_1.z.object({
            messageId: zod_1.z.string(),
            chatId: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        type: zod_1.z.literal("presence"),
        payload: zod_1.z.object({
            userId: zod_1.z.string(),
            isOnline: zod_1.z.boolean(),
        }),
    }),
    zod_1.z.object({
        type: zod_1.z.literal("init"),
        payload: zod_1.z.object({
            userId: zod_1.z.string(),
        }),
    }),
]);
exports.insertUserSchema = exports.userSchema.omit({ isOnline: true, lastSeen: true });
exports.users = null;
