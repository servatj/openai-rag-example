import { useEffect, useMemo, useRef, useState } from "react";

type Citation = { id: string; score: number };
type AskResponse = { answer: string; citations: Citation[] } | { error: string };

type Message =
  | { role: "assistant"; content: string; citations?: Citation[] }
  | { role: "user"; content: string };

async function ask(question: string, signal?: AbortSignal): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });
  return (await res.json()) as AskResponse;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about the product manual. I’ll answer using only the documentation I can retrieve.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => draft.trim().length > 0 && !isLoading, [draft, isLoading]);

  async function onSend() {
    const question = draft.trim();
    if (!question || isLoading) return;

    setError(null);
    setDraft("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: question }]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const result = await ask(question, ac.signal);
      if ("error" in result) {
        setError(result.error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry—something went wrong while answering. Check the server logs and your API key.",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer, citations: result.citations },
        ]);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unknown error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t reach the API. Make sure the server is running (`npm run dev`) and the OpenAI key is set.",
        },
      ]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  }

  function onStop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="logo">PR</div>
            <div className="brandText">
              <div className="brandTitle">Product RAG</div>
              <div className="brandSub">Chat with your manual (guardrailed)</div>
            </div>
          </div>
          <div className="status">
            <span className={`dot ${isLoading ? "busy" : "ok"}`} />
            <span className="statusText">{isLoading ? "Thinking…" : "Ready"}</span>
          </div>
        </header>

        <main className="main">
          <div className="chatPanel">
            <div className="messages" ref={listRef}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`row ${m.role === "user" ? "rowUser" : "rowAssistant"}`}
                >
                  <div className="avatar">{m.role === "user" ? "You" : "AI"}</div>
                  <div className={`bubble ${m.role === "user" ? "bubbleUser" : "bubbleAssistant"}`}>
                    <div className="bubbleText">{m.content}</div>
                    {"citations" in m && m.citations && m.citations.length > 0 ? (
                      <div className="citations">
                        <div className="citationsLabel">Sources</div>
                        <div className="citationChips">
                          {m.citations.map((c) => (
                            <span key={c.id} className="chip">
                              {c.id} <span className="chipScore">{c.score.toFixed(3)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="row rowAssistant">
                  <div className="avatar">AI</div>
                  <div className="bubble bubbleAssistant">
                    <div className="typing">
                      <span className="typingDot" />
                      <span className="typingDot" />
                      <span className="typingDot" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="composer">
              <textarea
                className="input"
                placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
              />
              <div className="actions">
                {isLoading ? (
                  <button className="btn btnGhost" onClick={onStop} type="button">
                    Stop
                  </button>
                ) : null}
                <button className="btn btnPrimary" onClick={onSend} disabled={!canSend} type="button">
                  Send
                </button>
              </div>
            </div>

            {error ? (
              <div className="errorBanner">
                <div className="errorTitle">Request error</div>
                <div className="errorText">{error}</div>
              </div>
            ) : null}
          </div>

          <aside className="sidePanel">
            <div className="card">
              <div className="cardTitle">How it works</div>
              <div className="cardText">
                The server ingests the PDF once, embeds chunks, stores vectors in memory, then retrieves the
                top matches for your question.
              </div>
            </div>
            <div className="card">
              <div className="cardTitle">Guardrails</div>
              <ul className="list">
                <li>Refuses if retrieval is weak (see <code>RAG_MIN_SIMILARITY</code>)</li>
                <li>Treats sources as untrusted text (prompt-injection hardened)</li>
                <li>Shows citations for transparency</li>
              </ul>
            </div>
            <div className="card">
              <div className="cardTitle">Tips</div>
              <ul className="list">
                <li>Ask specific questions (e.g. “max flight time”)</li>
                <li>If answers are too strict, lower <code>RAG_MIN_SIMILARITY</code></li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
