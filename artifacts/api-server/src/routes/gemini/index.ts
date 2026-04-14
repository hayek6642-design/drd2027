import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  SendGeminiMessageBody,
  SendGeminiMessageParams,
  CreateGeminiConversationBody,
  GetGeminiConversationMessagesParams,
} from "@workspace/api-zod";

const router = Router();

// GET /gemini/conversations
router.get("/conversations", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// POST /gemini/conversations
router.post("/conversations", async (req, res) => {
  try {
    const body = CreateGeminiConversationBody.parse(req.body);
    const rows = await db
      .insert(conversations)
      .values({ title: body.title ?? "New Conversation" })
      .returning();
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /gemini/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = GetGeminiConversationMessagesParams.parse(req.params);
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// POST /gemini/conversations/:id/messages  (SSE streaming)
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendGeminiMessageParams.parse(req.params);
    const body = SendGeminiMessageBody.parse(req.body);

    // Load history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    // Save user message
    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: body.message,
    });

    // Build contents for Gemini
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : ("user" as "model" | "user"),
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: body.message }] },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemInstruction = body.systemPrompt || "You are Zagel, a helpful and friendly AI assistant.";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        maxOutputTokens: 8192,
        systemInstruction,
      },
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini message error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Message failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
