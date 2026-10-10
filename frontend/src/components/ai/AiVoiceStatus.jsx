import React from "react";

export function AiVoiceStatus({ isListening, isThinking, isSpeaking, error, notice }) {
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "14px",
          background: "var(--danger-light)",
          color: "var(--danger)",
          border: "1px solid var(--danger-border)",
          fontSize: "11px",
          fontWeight: 600
        }}
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--danger)" }} />
        <span>{error}</span>
      </div>
    );
  }

  if (isListening) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "14px",
          background: "var(--brand-light)",
          color: "var(--brand-dark)",
          border: "1px solid var(--brand-border)",
          fontSize: "11px",
          fontWeight: 700
        }}
      >
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
        <span>🎙️ Listening... Speak now</span>
      </div>
    );
  }

  if (isThinking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "14px",
          background: "var(--accent-light)",
          color: "var(--accent-dark)",
          border: "1px solid var(--accent-border)",
          fontSize: "11px",
          fontWeight: 700
        }}
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
        <span>🧠 Thinking... Querying Gemini</span>
      </div>
    );
  }

  if (isSpeaking) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "14px",
          background: "var(--info-light)",
          color: "var(--info)",
          border: "1px solid var(--info-border)",
          fontSize: "11px",
          fontWeight: 700
        }}
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--info)" }} />
        <span>🔊 Speaking response...</span>
      </div>
    );
  }

  if (notice) {
    return (
      <div
        style={{
          fontSize: "10.5px",
          color: "var(--accent-dark)",
          background: "var(--accent-light)",
          padding: "3px 8px",
          borderRadius: "6px",
          border: "1px solid var(--accent-border)"
        }}
      >
        ⚠️ {notice}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", opacity: 0.9 }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
      <span>Online ● Gemini AI Connected</span>
    </div>
  );
}

export default AiVoiceStatus;
