import { Ollama } from "ollama";

// Points at a local Ollama daemon (`ollama serve`, or the desktop app, which
// runs it in the background automatically) — free, no API key. Not reachable
// from a deployed Render instance; the chat widget degrades to an error
// message there unless OLLAMA_HOST is pointed at a reachable Ollama server.
export const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434" });

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
