import { WebSocketServer, WebSocket } from "ws";
import { log } from "./index.js";
import { registerFileRoutes } from "./fileUpload.js";
import { e7kiDatabase } from "./database.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const clients = new Map();
const PRESENCE_TIMEOUT = 30000;

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads', 'e7ki');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.user?.id || 'anonymous');
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    cb(null, allowed.includes(file.mimetype));
  }
});

export async function registerRoutes(httpServer, app) {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    
    wss.on("connection", (ws) => {
        let clientId = null;
        log("New WebSocket connection", "ws");
        
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                switch (message.type) {
                    case "init":
                        clientId = message.payload.userId;
                        clients.set(clientId, { ws, userId: clientId, lastSeen: Date.now(), status: "online" });
                        log(`Client ${clientId} connected`, "ws");
                        broadcast({
                            type: "presence",
                            payload: { userId: clientId, status: "online" },
                        }, clientId);
                        break;
                    case "message":
                        log(`Message from ${message.payload.senderId}`, "ws");
                        const sentMessage = {
                            ...message.payload,
                            status: "sent",
                        };
                        broadcast({
                            type: "message",
                            payload: sentMessage,
                        });
                        break;
                    case "typing":
                        broadcast({
                            type: "typing",
                            payload: message.payload,
                        }, message.payload.userId);
                        break;
                    case "read":
                        broadcast({
                            type: "read",
                            payload: message.payload,
                        }, message.payload.userId);
                        break;
                    case "reaction":
                        broadcast({
                            type: "reaction",
                            payload: message.payload,
                        });
                        break;
                    case "presence":
                        {
                            const { status } = message.payload;
                            if (clientId && clients.has(clientId)) {
                                const c = clients.get(clientId);
                                c.lastSeen = Date.now();
                                c.status = status || "online";
                                broadcast({ type: "presence", payload: { userId: clientId, status: c.status } }, clientId);
                            }
                        }
                        break;
                    case "delete":
                        broadcast({
                            type: "delete",
                            payload: message.payload,
                        });
                        break;
                }
            }
            catch (error) {
                log(`Error parsing message: ${error}`, "ws");
            }
        });
        
        ws.on("close", () => {
            if (clientId) {
                clients.delete(clientId);
                log(`Client ${clientId} disconnected`, "ws");
                broadcast({ type: "presence", payload: { userId: clientId, status: "offline" } }, clientId);
            }
        });
        
        ws.on("error", (error) => {
            log(`WebSocket error: ${error}`, "ws");
        });
    });
    
    setInterval(() => {
        const now = Date.now();
        clients.forEach((client, id) => {
            if (client.userId && now - (client.lastSeen || 0) > PRESENCE_TIMEOUT) {
                client.status = "offline";
                broadcast({ type: "presence", payload: { userId: id, status: "offline" } }, id);
            }
        });
    }, 10000);
    
    function broadcast(message, excludeUserId) {
        const messageStr = JSON.stringify(message);
        clients.forEach((client, id) => {
            if (id !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(messageStr);
            }
        });
    }
    
    // E7ki API Routes
    app.get("/api/e7ki/health", (req, res) => {
        res.json({ 
            status: "ok", 
            connections: clients.size,
            database: "sqlite"
        });
    });
    
    // Get conversations for current user
    app.get("/api/e7ki/chats", async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            
            const conversations = e7kiDatabase.getConversations(userId);
            res.json(conversations);
        } catch (error) {
            log(`Error fetching chats: ${error}`, "api");
            res.status(500).json({ error: "Failed to fetch chats" });
        }
    });
    
    // Get messages for a conversation
    app.get("/api/e7ki/messages", async (req, res) => {
        try {
            const userId = req.user?.id;
            const conversationId = req.query.chat_id;
            
            if (!userId || !conversationId) {
                return res.status(400).json({ error: "Missing parameters" });
            }
            
            // Verify user is part of conversation
            const conversation = e7kiDatabase.getConversation(conversationId);
            if (!conversation || !conversation.participant_ids.includes(userId)) {
                return res.status(403).json({ error: "Access denied" });
            }
            
            const messages = e7kiDatabase.getMessages(conversationId);
            res.json(messages);
        } catch (error) {
            log(`Error fetching messages: ${error}`, "api");
            res.status(500).json({ error: "Failed to fetch messages" });
        }
    });
    
    // Send message
    app.post("/api/e7ki/messages", async (req, res) => {
        try {
            const userId = req.user?.id;
            const { chat_id, content, type = 'text', media_url } = req.body;
            
            if (!userId || !chat_id || !content) {
                return res.status(400).json({ error: "Missing parameters" });
            }
            
            // Verify user is part of conversation
            const conversation = e7kiDatabase.getConversation(chat_id);
            if (!conversation || !conversation.participant_ids.includes(userId)) {
                return res.status(403).json({ error: "Access denied" });
            }
            
            const messageId = e7kiDatabase.saveMessage({
                conversationId: chat_id,
                senderId: userId,
                content,
                type,
                mediaUrl: media_url
            });
            
            // Broadcast to WebSocket clients
            const messageData = {
                id: messageId,
                chatId: chat_id,
                senderId: userId,
                content,
                type,
                mediaUrl: media_url,
                status: "sent",
                timestamp: Date.now()
            };
            
            broadcast({
                type: "message",
                payload: messageData
            });
            
            res.json({ success: true, messageId });
        } catch (error) {
            log(`Error sending message: ${error}`, "api");
            res.status(500).json({ error: "Failed to send message" });
        }
    });
    
    // Upload file
    app.post("/api/e7ki/upload", upload.single('file'), async (req, res) => {
        try {
            const userId = req.user?.id;
            const chatId = req.body.chat_id;
            const file = req.file;
            
            if (!userId || !chatId || !file) {
                return res.status(400).json({ error: "Missing parameters" });
            }
            
            // Verify user is part of conversation
            const conversation = e7kiDatabase.getConversation(chatId);
            if (!conversation || !conversation.participant_ids.includes(userId)) {
                return res.status(403).json({ error: "Access denied" });
            }
            
            // Save message with file
            const messageId = e7kiDatabase.saveMessage({
                conversationId: chatId,
                senderId: userId,
                content: file.originalname,
                type: file.mimetype.startsWith('image/') ? 'image' : 
                       file.mimetype.startsWith('audio/') ? 'voice' : 'file',
                mediaUrl: `/uploads/e7ki/${userId}/${file.filename}`
            });
            
            // Store file metadata
            e7kiDatabase.storeMediaFile(messageId, file.path, file.mimetype, file.size);
            
            // Broadcast to WebSocket clients
            const messageData = {
                id: messageId,
                chatId: chatId,
                senderId: userId,
                content: file.originalname,
                type: file.mimetype.startsWith('image/') ? 'image' : 
                       file.mimetype.startsWith('audio/') ? 'voice' : 'file',
                mediaUrl: `/uploads/e7ki/${userId}/${file.filename}`,
                status: "sent",
                timestamp: Date.now()
            };
            
            broadcast({
                type: "message",
                payload: messageData
            });
            
            res.json({ 
                success: true, 
                messageId,
                url: `/uploads/e7ki/${userId}/${file.filename}`
            });
        } catch (error) {
            log(`Error uploading file: ${error}`, "api");
            res.status(500).json({ error: "Failed to upload file" });
        }
    });
    
    // Typing indicator
    app.post("/api/e7ki/typing", async (req, res) => {
        try {
            const userId = req.user?.id;
            const { chat_id, is_typing } = req.body;
            
            if (!userId || !chat_id) {
                return res.status(400).json({ error: "Missing parameters" });
            }
            
            broadcast({
                type: "typing",
                payload: {
                    chatId: chat_id,
                    userId: userId,
                    isTyping: Boolean(is_typing)
                }
            });
            
            res.json({ success: true });
        } catch (error) {
            log(`Error sending typing: ${error}`, "api");
            res.status(500).json({ error: "Failed to send typing" });
        }
    });
    
    registerFileRoutes(app);
    return httpServer;
}
