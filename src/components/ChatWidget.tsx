import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm Aerion's support assistant. I can search flights, check live flight status, or look up an existing booking (reference + email). What can I help with?",
};

// Renders assistant text, turning [label](/book/OFFER_ID) markdown-style links
// into real in-app navigation instead of a full page reload.
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\[[^\]]+\]\(\/book\/[^)]+\))/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\((\/book\/[^)]+)\)$/);
        if (match) {
          return (
            <Link key={i} to={match[2]} className="font-semibold text-sky-500 underline underline-offset-2">
              {match[1]}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, statusLabel]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    setStatusLabel(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim());

          if (event.type === "text") {
            setStatusLabel(null);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updated[updated.length - 1].content + event.text,
              };
              return updated;
            });
          } else if (event.type === "status") {
            setStatusLabel(event.label);
          } else if (event.type === "error") {
            setStatusLabel(null);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updated[updated.length - 1].content || `Sorry, something went wrong: ${event.error}`,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: updated[updated.length - 1].content || "Sorry, I couldn't connect. Please try again.",
        };
        return updated;
      });
    } finally {
      setStatusLabel(null);
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-navy-800/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-navy-950 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Aerion Support</p>
              <p className="text-xs text-white/60">Usually replies instantly</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    m.role === "user" ? "bg-navy-950 text-white" : "bg-navy-950/5 text-navy-950"
                  }`}
                >
                  {m.content ? <MessageContent content={m.content} /> : <TypingDots />}
                </div>
              </div>
            ))}
            {statusLabel && <p className="px-1 text-xs italic text-navy-950/50">{statusLabel}</p>}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-navy-800/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flights, status, bookings…"
              className="flex-1 rounded-full border border-navy-800/15 px-3 py-2 text-sm text-navy-950 outline-none focus:border-sky-400"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-950 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-gold-400 text-navy-950 shadow-xl transition-transform hover:scale-105"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-950/40 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-950/40 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-950/40" />
    </span>
  );
}
