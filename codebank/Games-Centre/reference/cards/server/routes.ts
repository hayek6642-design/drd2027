import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === HTTP API Routes ===

  app.post(api.users.register.path, async (req, res) => {
    try {
      const input = api.users.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(input);
      // In a real app, set session here
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.users.login.path, async (req, res) => {
    try {
      const input = api.users.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user || user.password !== input.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.competitions.create.path, async (req, res) => {
    try {
      const input = api.competitions.create.input.parse(req.body);
      const competition = await storage.createCompetition(input);
      res.status(201).json(competition);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.competitions.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const competition = await storage.getCompetition(id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }
    res.json(competition);
  });

  app.post(api.competitions.lockAssets.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const { userId, amount } = req.body;
    const lockId = await storage.lockAssets(userId, amount, id);
    res.json({ success: true, lockId });
  });

  app.post(api.competitions.settle.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const { winnerId, reason } = req.body;
    // Assuming winner reward logic is handled by caller or pre-calculated
    // For MVP, just logging the settlement
    const transactionId = await storage.settleCompetition(id, winnerId, 0); 
    res.json({ success: true, transactionId });
  });


  // === WebSocket Server ===

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map to track active connections per competition
  const competitionClients = new Map<number, Set<WebSocket>>();

  wss.on('connection', (ws) => {
    console.log("New WebSocket connection");

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'JOIN_LOBBY') {
          const { competitionId, userId } = data;
          
          if (!competitionClients.has(competitionId)) {
            competitionClients.set(competitionId, new Set());
          }
          competitionClients.get(competitionId)!.add(ws);
          
          // Store metadata on the socket
          (ws as any).competitionId = competitionId;
          (ws as any).userId = userId;

          console.log(`User ${userId} joined lobby ${competitionId}`);
          
          // Broadcast join to others in lobby
          broadcastToCompetition(competitionId, {
            type: 'PLAYER_JOINED',
            userId
          }, ws);
        }
        else if (data.type === 'GAME_ACTION' || data.type === 'CHAT_MESSAGE' || data.type === 'SIGNALING') {
          // Relay to other players in the same competition
          broadcastToCompetition(data.competitionId, data, ws);
        }

      } catch (err) {
        console.error("WS Error:", err);
      }
    });

    ws.on('close', () => {
      const competitionId = (ws as any).competitionId;
      if (competitionId && competitionClients.has(competitionId)) {
        competitionClients.get(competitionId)!.delete(ws);
        if (competitionClients.get(competitionId)!.size === 0) {
          competitionClients.delete(competitionId);
        }
      }
    });
  });

  function broadcastToCompetition(competitionId: number, message: any, sender: WebSocket) {
    const clients = competitionClients.get(competitionId);
    if (clients) {
      clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
