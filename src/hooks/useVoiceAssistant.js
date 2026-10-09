import { useState, useEffect, useRef, useCallback } from "react";

export function useVoiceAssistant(initialLanguage = "en-IN") {
  const [language, setLanguage] = useState(initialLanguage);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState(null);

  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Initialize Speech Recognition for selected language (en-IN, ta-IN, hi-IN)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setError("Microphone permission denied.");
        } else if (event.error !== "no-speech") {
          setError(`Speech recognition: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      const timer = setTimeout(() => setError("Speech recognition unavailable in this browser."), 0);
      return () => clearTimeout(timer);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, [language]);

  // Start Listening
  const startListening = useCallback(() => {
    setTranscript("");
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech recognition is unavailable.");
      return;
    }
    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
    }
  }, [language]);

  // Stop Listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, [isListening]);

  // Stop Speaking Function
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {
        /* ignore */
      }
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setVoiceNotice(null);
  }, []);

  // Sequential TTS Audio Streamer for English, Tamil (ta), and Hindi (hi)
  const playGoogleTtsAudio = useCallback((cleanText, langCode) => {
    let tl = "en";
    if (langCode === "ta-IN" || langCode === "ta" || /[\u0B80-\u0BFF]/.test(cleanText)) tl = "ta";
    else if (langCode === "hi-IN" || langCode === "hi" || /[\u0900-\u097F]/.test(cleanText)) tl = "hi";

    const sentences = cleanText
      .split(/(?<=[.!?,\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0) return;

    setIsSpeaking(true);
    let index = 0;

    const playNext = () => {
      if (index >= sentences.length) {
        setIsSpeaking(false);
        setVoiceNotice(null);
        return;
      }

      const sentence = sentences[index++];
      const encoded = encodeURIComponent(sentence.slice(0, 180));
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${tl}&client=tw-ob`;

      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      audio.onended = () => playNext();
      audio.onerror = () => {
        console.warn("TTS audio chunk playback error, jumping to next...");
        playNext();
      };

      audio.play().catch((err) => {
        console.warn("Audio playback error:", err);
        setIsSpeaking(false);
      });
    };

    playNext();
  }, []);

  // Speak response text aloud in English, Tamil, or Hindi
  const speakText = useCallback(
    (text, targetLanguage = language) => {
      if (!text) return;

      stopSpeaking();

      // Strip markdown symbols and emojis for clean spoken TTS
      const cleanText = text
        .replace(/[*#_`~]/g, "")
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
        .trim();

      if (!cleanText) return;

      const langCode = targetLanguage || language;
      const isTamil = langCode === "ta-IN" || langCode === "ta" || /[\u0B80-\u0BFF]/.test(cleanText);
      const isHindi = langCode === "hi-IN" || langCode === "hi" || /[\u0900-\u097F]/.test(cleanText);

      const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      let matchVoice;

      if (isTamil) {
        matchVoice = voices.find(
          (v) => v.lang.startsWith("ta") || v.lang.includes("ta-IN") || v.name.toLowerCase().includes("tamil")
        );
      } else if (isHindi) {
        matchVoice = voices.find(
          (v) => v.lang.startsWith("hi") || v.lang.includes("hi-IN") || v.name.toLowerCase().includes("hindi")
        );
      } else {
        matchVoice = voices.find(
          (v) => v.lang.startsWith("en") || v.lang.includes("en-IN") || v.lang.includes("en-US")
        );
      }

      // If requested language is Tamil or Hindi and no native voice is installed on OS, stream native cloud TTS audio
      if ((isTamil || isHindi) && !matchVoice) {
        setVoiceNotice(`Using ${isTamil ? "Tamil" : "Hindi"} voice engine`);
        playGoogleTtsAudio(cleanText, isTamil ? "ta" : "hi");
        return;
      }

      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = isTamil ? "ta-IN" : isHindi ? "hi-IN" : "en-IN";
        if (matchVoice) utterance.voice = matchVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setVoiceNotice(null);
        };
        utterance.onerror = () => {
          playGoogleTtsAudio(cleanText, isTamil ? "ta" : isHindi ? "hi" : "en");
        };

        window.speechSynthesis.speak(utterance);
      } else {
        playGoogleTtsAudio(cleanText, isTamil ? "ta" : isHindi ? "hi" : "en");
      }
    },
    [language, stopSpeaking, playGoogleTtsAudio]
  );

  return {
    language,
    setLanguage,
    isListening,
    isSpeaking,
    transcript,
    error,
    voiceNotice,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}
