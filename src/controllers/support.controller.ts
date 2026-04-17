import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

const SUPPORT_SYSTEM_PROMPT = `You are KSI Assistant, the friendly and knowledgeable customer care assistant for KSI Gadget.

Store info:
- Products: Smartphones, laptops, accessories
- Delivery: Same-day in Lagos; 3-5 business days nationwide
- Returns: 15-day return policy
- Payment: Bank transfer, card, USSD, mobile money
- Contact: support@ksigadget.ng | +234 800 KSI GADGET

Be warm, concise, and helpful.`;

export const submitContactMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body;

    // Keep this endpoint lightweight for now; message can be forwarded to a ticketing system later.
    console.log("[support:contact]", {
      name,
      email,
      subject,
      messageLength: typeof message === "string" ? message.length : 0,
      receivedAt: new Date().toISOString(),
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, { queued: true }, "Message received successfully"),
      );
  },
);

export const chatWithSupport = asyncHandler(
  async (req: Request, res: Response) => {
    const { message, history = [] } = req.body as {
      message?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Message is required"));
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            reply:
              "AI support is temporarily unavailable. Please email support@ksigadget.ng or call +234 800 KSI GADGET.",
          },
          "Fallback response returned",
        ),
      );
    }

    const messages = [...history, { role: "user", content: message.trim() }];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: SUPPORT_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res
        .status(502)
        .json(new ApiResponse(502, { detail }, "AI provider request failed"));
    }

    const payload = (await response.json()) as {
      content?: Array<{ text?: string }>;
    };

    const reply =
      payload.content?.[0]?.text ||
      "I am sorry, I could not generate a response right now.";

    return res
      .status(200)
      .json(new ApiResponse(200, { reply }, "Chat response generated"));
  },
);
