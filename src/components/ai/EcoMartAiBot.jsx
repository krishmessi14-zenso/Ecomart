import { useState, useRef, useEffect, useCallback, memo } from "react";
import { getAiResponse, AI_SUGGESTED_PROMPTS } from "../../utils/aiAssistantEngine.js";

const RobotIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="3" />
    <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="3" />
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function EcoMartAiBotBase() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi! I'm your **EcoMart AI Assistant**. How can I guide you today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Handle user send
  const handleSendMessage = useCallback(
    async (textToSend) => {
      const userText = (textToSend || input).trim();
      if (!userText) return;

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const userMsg = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userText,
        time: timeStr,
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInput("");
      setIsTyping(true);

      // Simulate AI processing delay
      setTimeout(async () => {
        let botReplyText = "";
        try {
          // Attempt backend query with engine fallback
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText }),
          }).catch(() => null);

          if (res && res.ok) {
            const data = await res.json();
            botReplyText = data.reply;
          }
        } catch {
          /* Fallback */
        }

        if (!botReplyText) {
          botReplyText = getAiResponse(userText);
        }

        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: botReplyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 600);
    },
    [input]
  );

  return (
    <>
      {/* Floating Toggle Button */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50px",
            padding: isOpen ? "12px 18px" : "14px 22px",
            boxShadow: "0 10px 25px rgba(5, 150, 105, 0.4)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "14px",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {isOpen ? <XIcon /> : <RobotIcon />}
          </div>
          <span>{isOpen ? "Close AI Help" : "EcoMart AI Assistant"}</span>
          {!isOpen && (
            <span
              style={{
                background: "#f59e0b",
                color: "#000",
                fontSize: "10px",
                fontWeight: 800,
                borderRadius: "10px",
                padding: "2px 6px",
                textTransform: "uppercase",
              }}
            >
              AI Live
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "86px",
            right: "24px",
            width: "min(400px, calc(100vw - 32px))",
            height: "min(560px, calc(100vh - 120px))",
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.22)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
            animation: "fcFadeIn 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)",
              color: "#ffffff",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SparklesIcon />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
                  EcoMart AI Assistant
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", opacity: 0.9 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
                  <span>Online • Ready to help</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8 }}
            >
              <XIcon />
            </button>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "var(--bg-soft)",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    background: m.sender === "user" ? "var(--brand)" : "var(--surface)",
                    color: m.sender === "user" ? "#ffffff" : "var(--text)",
                    padding: "12px 14px",
                    borderRadius: m.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    boxShadow: "var(--shadow-xs)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    border: m.sender === "user" ? "none" : "1px solid var(--border)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-soft)",
                    marginTop: "3px",
                    textAlign: m.sender === "user" ? "right" : "left",
                    padding: "0 4px",
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "var(--surface)",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>AI is typing</span>
                <span className="fc-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Prompts Chips */}
          <div
            style={{
              padding: "8px 12px",
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {AI_SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: "var(--bg-soft)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: "12px 14px",
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="fc-input"
              placeholder="Ask AI a question about EcoMart..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                fontSize: "13px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              style={{
                background: input.trim() ? "var(--brand)" : "var(--bg-soft)",
                color: input.trim() ? "#ffffff" : "var(--text-muted)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export const EcoMartAiBot = memo(EcoMartAiBotBase);
export default EcoMartAiBot;
