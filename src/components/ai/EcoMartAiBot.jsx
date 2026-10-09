import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useVoiceAssistant } from "../../hooks/useVoiceAssistant";
import { apiFetch } from "../../services/api";
import AiLanguageSelector from "./AiLanguageSelector";
import AiProductCard from "./AiProductCard";
import AiVoiceStatus from "./AiVoiceStatus";

// Sleek modern Robot head icon
const RobotIcon = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="9" width="16" height="11" rx="3" fill="rgba(255, 255, 255, 0.15)" />
    <circle cx="9" cy="14" r="1.5" fill="currentColor" />
    <circle cx="15" cy="14" r="1.5" fill="currentColor" />
    <path d="M10 18h4" strokeWidth="1.8" />
    <path d="M12 2v4" strokeWidth="2" />
    <circle cx="12" cy="2" r="1.5" fill="currentColor" />
    <path d="M2 13h2" strokeWidth="2" />
    <path d="M20 13h2" strokeWidth="2" />
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

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const VolumeXIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const GripIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.65" style={{ flexShrink: 0 }}>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

const SUGGESTED_PROMPTS = [
  "Track my order",
  "Find eco-friendly products",
  "Recommend a water bottle",
  "How many Green Points do I have?",
  "What is EcoScore?"
];

function EcoMartAiBotBase({ contextProductId = null }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  // Draggable Position State (defaults to bottom-right corner)
  const [position, setPosition] = useState(() => {
    const initialX = typeof window !== "undefined" ? Math.max(16, window.innerWidth - 84) : 1000;
    const initialY = typeof window !== "undefined" ? Math.max(16, window.innerHeight - 84) : 700;
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);

  // Drag Event Handlers
  const handleDragStart = useCallback((e) => {
    if (e.target.closest("button") && !e.currentTarget.classList?.contains("fc-bot-float-container")) {
      const isHeader = e.currentTarget.getAttribute("data-drag-header") === "true";
      if (!isHeader) return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y
    };
    hasDraggedRef.current = false;
    setIsDragging(true);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasDraggedRef.current = true;
      }

      const maxX = Math.max(16, window.innerWidth - 76);
      const maxY = Math.max(16, window.innerHeight - 76);

      const newX = Math.max(16, Math.min(maxX, dragStartRef.current.posX + deltaX));
      const newY = Math.max(16, Math.min(maxY, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  // Recalculate modal position dynamically to fit on viewport
  const modalStyle = useMemo(() => {
    const modalWidth = Math.min(420, window.innerWidth - 32);
    const modalHeight = Math.min(600, window.innerHeight - 120);

    const isRightHalf = position.x > window.innerWidth / 2;
    const isBottomHalf = position.y > window.innerHeight / 2;

    let left = isRightHalf
      ? Math.max(16, position.x + 60 - modalWidth)
      : Math.min(window.innerWidth - modalWidth - 16, position.x);

    let top = isBottomHalf
      ? Math.max(16, position.y - modalHeight - 12)
      : Math.min(window.innerHeight - modalHeight - 16, position.y + 72);

    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${modalWidth}px`,
      height: `${modalHeight}px`,
      background: "var(--surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 20px 48px rgba(0, 0, 0, 0.22)",
      border: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      zIndex: 9999,
      overflow: "hidden",
      animation: "fcFadeIn 0.2s ease-out"
    };
  }, [position]);

  const {
    language,
    setLanguage,
    isListening,
    isSpeaking,
    transcript,
    error: voiceError,
    voiceNotice,
    startListening,
    stopListening,
    speakText,
    stopSpeaking
  } = useVoiceAssistant("en-IN");

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "🌱 **Welcome to EcoMart AI Voice & Chat Assistant!**\n\nI am your smart assistant for sustainable shopping! Ask me to track orders, recommend plastic-free products, check Green Points, or explain EcoScores in English, தமிழ், or हिन्दी! Type your message or tap 🎙️ to speak!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      recommendations: []
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Action trigger navigation
  const handleActionTrigger = useCallback(
    (action) => {
      if (!action) return;
      if (action === "open_cart") navigate("/customer/cart");
      else if (action === "open_wishlist") navigate("/customer/wishlist");
      else if (action === "track_order" || action === "list_orders") navigate("/customer/orders");
      else if (action === "search_products" || action === "recommend_products") navigate("/customer/marketplace");
    },
    [navigate]
  );

  // Send message handler
  const handleSendMessage = useCallback(
    async (textToSend, isVoiceInput = false) => {
      const userText = (textToSend || input).trim();
      if (!userText) return;

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const userMsg = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userText,
        time: timeStr
      };

      // Extract recent ~10 history messages
      const recentHistory = messages.slice(-10).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInput("");
      setIsThinking(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const payload = {
          message: userText,
          selectedLanguage: language,
          history: recentHistory
        };

        const res = await apiFetch("/api/chat", {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const botReply = data.reply || "I am here to help you with EcoMart!";

          const botMsg = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: botReply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            recommendations: data.recommendations || []
          };

          setMessages((prev) => [...prev, botMsg]);

          // Speak reply aloud in selected language (English / Tamil / Hindi)
          speakText(botReply, data.language || language);

          if (data.actionTriggered) {
            handleActionTrigger(data.actionTriggered);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to reach AI service.");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("AI service error:", err);
        let friendlyFallback = "I am sorry, I am having trouble connecting to the AI service right now. Please try again in a moment!";
        if (err.name === "AbortError") {
          friendlyFallback = "⏱️ Request timed out while waiting for AI Assistant. Please try again or tap a quick action chip!";
        }
        const botMsg = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: friendlyFallback,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          recommendations: []
        };
        setMessages((prev) => [...prev, botMsg]);
      } finally {
        setIsThinking(false);
      }
    },
    [input, language, messages, speakText, handleActionTrigger]
  );

  const handleClearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Conversation reset. How can I help you next?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        recommendations: []
      }
    ]);
  };

  // Handle final voice transcript from SpeechRecognition
  useEffect(() => {
    if (transcript && !isListening) {
      handleSendMessage(transcript, true);
    }
  }, [transcript, isListening, handleSendMessage]);

  return (
    <>
      {/* Draggable Floating Robot Icon Button */}
      <div
        className="fc-bot-float-container"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 10000,
          touchAction: "none",
          userSelect: "none"
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <button
          type="button"
          onClick={(e) => {
            if (hasDraggedRef.current) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setIsOpen((prev) => !prev);
          }}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            color: "#ffffff",
            border: "2px solid rgba(255, 255, 255, 0.5)",
            boxShadow: isDragging
              ? "0 16px 36px rgba(5, 150, 105, 0.6), 0 0 0 4px rgba(16, 185, 129, 0.3)"
              : "0 10px 28px rgba(5, 150, 105, 0.45)",
            cursor: isDragging ? "grabbing" : "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: isDragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease",
            transform: isDragging ? "scale(1.08)" : "scale(1)"
          }}
          aria-label="EcoMart AI Voice & Chat Assistant (Drag to move)"
          title="EcoMart AI Voice & Chat Assistant (Click to open, Drag to move)"
        >
          {isOpen ? <XIcon /> : <RobotIcon />}
        </button>
      </div>

      {/* Draggable & Moveable Single Unified AI Assistant Window */}
      {isOpen && (
        <div style={modalStyle}>
          {/* Header Bar - Draggable Handle */}
          <div
            data-drag-header="true"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)",
              color: "#ffffff",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              touchAction: "none"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <GripIcon />
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <RobotIcon />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
                  EcoMart AI Assistant
                </h4>
                <AiVoiceStatus
                  isListening={isListening}
                  isThinking={isThinking}
                  isSpeaking={isSpeaking}
                  error={voiceError}
                  notice={voiceNotice}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  style={{
                    background: "var(--danger)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Stop speaking"
                >
                  <VolumeXIcon /> Stop
                </button>
              )}
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", borderRadius: "6px", padding: "6px", display: "flex" }}
              >
                <TrashIcon />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", borderRadius: "6px", padding: "6px", display: "flex" }}
              >
                <XIcon />
              </button>
            </div>
          </div>

          {/* Sub-Header: Language Selector (English | தமிழ் | हिन्दी) */}
          <div
            style={{
              background: "var(--bg-soft)",
              padding: "8px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
              🌐 Voice & Chat Language:
            </span>
            <AiLanguageSelector language={language} onSelectLanguage={setLanguage} />
          </div>

          {/* Single Feed */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "var(--bg-soft)"
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%"
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
                    whiteSpace: "pre-line"
                  }}
                >
                  {m.text}
                </div>

                {/* Interactive Product Recommendations */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Recommended Products:
                    </span>
                    {m.recommendations.map((prod) => (
                      <AiProductCard
                        key={prod.id}
                        product={prod}
                        onNavigateProduct={(id) => {
                          setIsOpen(false);
                          navigate(`/customer/product/${id}`);
                        }}
                      />
                    ))}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-soft)",
                    marginTop: "3px",
                    textAlign: m.sender === "user" ? "right" : "left",
                    padding: "0 4px"
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}

            {isThinking && (
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
                  gap: 6
                }}
              >
                <span>AI Assistant is analyzing</span>
                <span className="fc-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggested Chips */}
          <div
            style={{
              padding: "8px 12px",
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              whiteSpace: "nowrap"
            }}
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
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
                  flexShrink: 0
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Unified Input Bar (Text + Voice Mic) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "8px",
              alignItems: "center"
            }}
          >
            <input
              type="text"
              className="fc-input"
              placeholder={
                language === "ta-IN"
                  ? "தமிழில் கேட்கவும் அல்லது 🎙️ தட்டவும்..."
                  : language === "hi-IN"
                  ? "हिंदी में पूछें या 🎙️ दबाएं..."
                  : "Ask AI or tap 🎙️ to speak..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                fontSize: "13px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)"
              }}
            />

            {/* Mic Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              style={{
                background: isListening ? "var(--danger)" : "var(--brand)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isListening ? "0 0 10px rgba(220, 38, 38, 0.5)" : "none"
              }}
              title={
                isListening
                  ? "Listening... Tap to stop"
                  : `Tap to speak in ${language === "ta-IN" ? "Tamil" : language === "hi-IN" ? "Hindi" : "English"}`
              }
            >
              <MicIcon />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              style={{
                background: input.trim() ? "var(--brand)" : "var(--bg-soft)",
                color: input.trim() ? "#ffffff" : "var(--text-muted)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
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

