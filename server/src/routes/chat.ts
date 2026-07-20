import { Router } from "express";
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from "groq-sdk/resources/chat/completions";
import { groq, GROQ_MODEL } from "../lib/groq.js";
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

  const chatMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const MAX_ATTEMPTS_PER_TURN = 2;

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      let content = "";
      let toolCalls: ChatCompletionMessageToolCall[] = [];

      for (let attempt = 1; ; attempt++) {
        let emittedText = false;
        let attemptContent = "";
        // Streamed tool calls arrive as partial fragments keyed by index — the id
        // and function name land in the first fragment for that index, and
        // `arguments` accumulates as a JSON string across subsequent chunks.
        const toolCallsByIndex = new Map<number, { id: string; name: string; args: string }>();

        try {
          const stream = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: chatMessages,
            tools: chatTools,
            // Lower temperature makes malformed/hallucinated tool-call JSON
            // (an occasional Groq/Llama flakiness) noticeably less frequent.
            temperature: 0.3,
            stream: true,
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              attemptContent += delta.content;
              emittedText = true;
              send({ type: "text", text: delta.content });
            }
            for (const fragment of delta?.tool_calls ?? []) {
              const entry = toolCallsByIndex.get(fragment.index) ?? { id: "", name: "", args: "" };
              if (fragment.id) entry.id = fragment.id;
              if (fragment.function?.name) entry.name += fragment.function.name;
              if (fragment.function?.arguments) entry.args += fragment.function.arguments;
              toolCallsByIndex.set(fragment.index, entry);
            }
          }

          content = attemptContent;
          toolCalls = [...toolCallsByIndex.values()].map((t, i) => ({
            id: t.id || `call_${i}`,
            type: "function" as const,
            function: { name: t.name, arguments: t.args },
          }));
          break; // success
        } catch (streamErr) {
          // The model occasionally produces an invalid tool call mid-stream; Groq
          // surfaces that as an error on the stream itself. Safe to silently retry
          // once, but only if nothing has reached the user yet for this attempt —
          // otherwise a retry would duplicate or contradict what they already saw.
          if (!emittedText && attempt < MAX_ATTEMPTS_PER_TURN) {
            console.error("chat: retrying turn after stream error:", streamErr);
            continue;
          }
          throw streamErr;
        }
      }

      chatMessages.push({
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls.length ? toolCalls : undefined,
      });

      if (toolCalls.length === 0) break;

      for (const call of toolCalls) {
        send({ type: "status", label: statusLabel(call.function.name) });
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // fall through with empty args — executeTool reports the resulting error
        }
        const result = await executeTool(call.function.name, args);
        chatMessages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }

    send({ type: "done" });
  } catch (err) {
    console.error("chat error:", err);
    const status = (err as { status?: number } | undefined)?.status;
    const message = err instanceof Error ? err.message : "Chat request failed";
    const hint = status === 401 ? "The chatbot isn't configured correctly (missing or invalid GROQ_API_KEY)." : message;
    send({ type: "error", error: hint });
  } finally {
    res.end();
  }
});
