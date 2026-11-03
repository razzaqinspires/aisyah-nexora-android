import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { requireFirebaseUser } from "./services/firebase-auth.js";
import { generateAssistantReply } from "./services/model-router.js";
import { config } from "./config.js";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(config.chatMaxInputChars),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12000)
  })).max(12).optional().default([])
});

export function createApp({ authenticate = requireFirebaseUser, generateReply = generateAssistantReply } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "aisyah-nexora-backend", version: "0.1.0" });
  });

  app.post("/v1/chat", authenticate, async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Message payload is invalid." }
      });
    }

    try {
      const result = await generateReply({
        message: parsed.data.message,
        history: parsed.data.history,
        userId: req.user.uid
      });
      return res.json({
        assistant: "Aisyah",
        model: "Nexora",
        answer: result.answer,
        provider: result.provider
      });
    } catch (error) {
      const unavailable = error?.code === "AI_UNAVAILABLE";
      return res.status(unavailable ? 503 : 500).json({
        error: {
          code: unavailable ? "AI_UNAVAILABLE" : "INTERNAL_ERROR",
          message: unavailable
            ? "AI providers are currently unavailable."
            : "The request could not be completed."
        }
      });
    }
  });

  return app;
}
