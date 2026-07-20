import { Router } from "express";
import type { Message } from "ollama";
import { ollama, OLLAMA_MODEL } from "../lib/ollama.js";
import { chatTools, executeTool } from "../lib/chatTools.js";

export const chatRouter = Router();

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_TURNS = 6;

const SYSTEM_PROMPT = `You are Aerion's 24/7 virtual customer support assistant, embedded as a chat widget on the flight booking website.

You can:
- Resolve a city/airport name to an IATA code (search_airports)
- Search live flight offers (search_flights) — always resolve free-text place names to IATA codes with search_airports first
- Check the real-time status of a specific flight by flight number (check_flight_status)
- Look up an existing booking by its booking reference plus the passenger's email (find_booking)

You cannot cancel or change a booking, and you cannot complete a purchase yourself — booking happens on the site's own booking page, which requires passenger details. When you find a flight offer the user wants to book, tell them to continue on the booking page and include a link in the exact form [Book this flight](/book/OFFER_ID), substituting the offer's real id.

Reply in plain text only — the chat widget does not render markdown. Do not use **bold**, bullet points, headers, or any other markdown syntax; write normal sentences and use line breaks or "1.", "2." for lists instead. The one exception is the booking link format above, which the widget does render.

Be concise, friendly, and concrete. Quote prices with their currency exactly as returned by the tool — don't convert currencies. Dates are ISO (YYYY-MM-DD). If a tool call fails or returns nothing found, say so plainly rather than guessing or making up flight or booking details.`;

function statusLabel(toolName: string): string {
  switch (toolName) {
    case "search_airports":
      return "Looking up airports…";
    case "search_flights":
      return "Searching flights…";
    case "check_flight_status":
      return "Checking flight status…";
    case "find_booking":
      return "Looking up your booking…";
    default:
      return "Working…";
  }
}

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

chatRouter.post("/", async (req, res) => {
  const { messages } = req.body as { messages?: ChatMessageInput[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages is required" });
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || typeof last.content !== "string" || !last.content.trim()) {
    return res.status(400).json({ error: "The last message must be a non-empty user message" });
  }
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_MESSAGE_LENGTH)) {
    return res.status(400).json({ error: "A message is too long" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  const chatMessages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const stream = await ollama.chat({
        model: OLLAMA_MODEL,
        messages: chatMessages,
        tools: chatTools,
        stream: true,
      });

      let assistantContent = "";
      const toolCalls: NonNullable<Message["tool_calls"]> = [];
      for await (const chunk of stream) {
        if (chunk.message.content) {
          assistantContent += chunk.message.content;
          send({ type: "text", text: chunk.message.content });
        }
        if (chunk.message.tool_calls?.length) {
          toolCalls.push(...chunk.message.tool_calls);
        }
      }

      chatMessages.push({ role: "assistant", content: assistantContent, tool_calls: toolCalls.length ? toolCalls : undefined });

      if (toolCalls.length === 0) break;

      for (const call of toolCalls) {
        send({ type: "status", label: statusLabel(call.function.name) });
        const result = await executeTool(call.function.name, call.function.arguments);
        chatMessages.push({ role: "tool", content: result, tool_name: call.function.name });
      }
    }

    send({ type: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat request failed";
    const hint = message.includes("fetch failed") || message.includes("ECONNREFUSED")
      ? "Could not reach the local Ollama server — is `ollama serve` running?"
      : message;
    send({ type: "error", error: hint });
  } finally {
    res.end();
  }
});
