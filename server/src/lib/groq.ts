import Groq from "groq-sdk";

// Free, hosted, OpenAI-compatible inference (console.groq.com) — no local
// server to run, so this works the same in dev and once deployed.
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Parallel-tool-use capable per Groq's docs; good balance of quality (for
// reliably picking the right tool) and generous free-tier rate limits.
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
