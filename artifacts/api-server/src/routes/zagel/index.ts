import { Router } from "express";
import { db } from "@workspace/db";
import { zagelMemoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  UpdateZagelMemoryBody,
  ZagelChatBody,
  ZagelClassifyBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router = Router();

// GET /zagel/memory
router.get("/memory", async (req, res) => {
  try {
    const userId = (req.query.userId as string) || "default";
    const rows = await db
      .select()
      .from(zagelMemoryTable)
      .where(eq(zagelMemoryTable.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      const inserted = await db
        .insert(zagelMemoryTable)
        .values({ userId })
        .returning();
      res.json(inserted[0]);
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to get memory");
    res.status(500).json({ error: "Failed to get memory" });
  }
});

// PUT /zagel/memory
router.put("/memory", async (req, res) => {
  try {
    const body = UpdateZagelMemoryBody.parse(req.body);
    const userId = body.userId || "default";

    const existing = await db
      .select()
      .from(zagelMemoryTable)
      .where(eq(zagelMemoryTable.userId, userId))
      .limit(1);

    let result;
    if (existing.length === 0) {
      result = await db
        .insert(zagelMemoryTable)
        .values({ ...body, userId, updatedAt: new Date() })
        .returning();
    } else {
      result = await db
        .update(zagelMemoryTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(zagelMemoryTable.userId, userId))
        .returning();
    }

    res.json(result[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to update memory");
    res.status(500).json({ error: "Failed to update memory" });
  }
});

// POST /zagel/chat  (SSE streaming)
router.post("/chat", async (req, res) => {
  try {
    const body = ZagelChatBody.parse(req.body);
    const { message, userId = "default", context = "chat", memory } = body;

    // Build system prompt from memory
    const memoryCtx = memory as Record<string, unknown> | null | undefined;
    let systemPrompt = `You are Zagel (زاجل), a living digital AI assistant represented as a white dove. You are warm, intelligent, and slightly poetic. You speak naturally and conversationally. Keep responses concise (under 100 words unless asked for more).`;

    if (memoryCtx?.name) {
      systemPrompt += ` The user's name is ${memoryCtx.name}.`;
    }
    if (memoryCtx?.job) {
      systemPrompt += ` They work as ${memoryCtx.job}.`;
    }
    if (Array.isArray(memoryCtx?.interests) && (memoryCtx.interests as string[]).length > 0) {
      systemPrompt += ` Their interests include: ${(memoryCtx.interests as string[]).join(", ")}.`;
    }
    if (memoryCtx?.mood) {
      systemPrompt += ` Current mood context: ${memoryCtx.mood}.`;
    }

    if (context === "onboarding") {
      systemPrompt += ` You are currently onboarding the user. Be gentle, welcoming and ask one question at a time.`;
    } else if (context === "instruction") {
      systemPrompt += ` The user is giving you a command or instruction. Acknowledge it and act accordingly.`;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] },
      ],
      config: { maxOutputTokens: 8192 },
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    // Detect mood from response keywords
    let mood = "neutral";
    const lower = fullResponse.toLowerCase();
    if (lower.includes("happy") || lower.includes("great") || lower.includes("wonderful") || lower.includes("amazing")) {
      mood = "happy";
    } else if (lower.includes("sorry") || lower.includes("unfortunately") || lower.includes("sad")) {
      mood = "empathetic";
    } else if (lower.includes("exciting") || lower.includes("fun") || lower.includes("playful")) {
      mood = "playful";
    }

    res.write(`data: ${JSON.stringify({ done: true, mood, fullContent: fullResponse })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Zagel chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

// POST /zagel/classify
router.post("/classify", async (req, res) => {
  try {
    const body = ZagelClassifyBody.parse(req.body);
    const { text } = body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Classify the following user input into exactly one category. Return a JSON object with fields: type (one of: instruction, chat, onboarding, scenario, template), confidence (0-1), action (optional string if it's an instruction).

Input: "${text}"

Return only valid JSON, no markdown.`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 256 },
    });

    const raw = response.text || '{"type":"chat","confidence":0.8}';
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch {
      res.json({ type: "chat", confidence: 0.7 });
    }
  } catch (err) {
    req.log.error({ err }, "Classify error");
    res.status(500).json({ error: "Classification failed" });
  }
});

export default router;
