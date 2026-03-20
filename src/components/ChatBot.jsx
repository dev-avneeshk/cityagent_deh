import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, ChevronDown, Sparkles, Maximize2, Minimize2, MapPin, Navigation, LocateFixed, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { streamKimiChat, buildCityContext, getSuggestedQuestions, checkRateLimit } from '../api/kimiChat';
import { fetchAQI, fetchWeather } from '../api/cityagent';

// Keywords that signal the user wants location-aware data
const LOCATION_KEYWORDS = [
  'my area', 'near me', 'my location', 'where i am', 'around me',
  'around here', 'my zone', 'nearby', 'in my', 'at my', 'here',
  'my house', 'my place', 'my neighbourhood', 'my neighborhood',
];
function hasLocationIntent(text) {
  const lower = text.toLowerCase();
  return LOCATION_KEYWORDS.some(kw => lower.includes(kw));
}

// Beautiful markdown renderer with subtle styling
function renderText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="text-[#f8fafc] font-bold drop-shadow-sm">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="bg-bg-deep border border-[#ffffff10] text-[#d8b4fe] px-1.5 py-0.5 rounded-md text-[11px] font-mono shadow-inner shadow-[#00000040]">
          {part.slice(1, -1)}
        </code>
      );
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 && <br />}</React.Fragment>
    ));
  });
}

export default function ChatBot({ city, data, alerts }) {
  const [open, setOpen]       = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError]     = useState(null);
  const [userCoords, setUserCoords]       = useState(null);   // { lat, lon }
  const [userLocData, setUserLocData]     = useState(null);   // { aqi, weather } fetched for exact GPS
  const [locStatus, setLocStatus]         = useState('idle'); // idle | fetching | granted | denied
  const [pendingQuestion, setPendingQuestion] = useState(null); // question waiting for location
  const [listening, setListening]   = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(''); // interim transcript shown while recording
  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);
  const recognitionRef = useRef(null);
  const messagesRef    = useRef(messages); // always mirrors messages state
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const suggested = getSuggestedQuestions(data, alerts ?? []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Core stream function — takes already-built history and optional coord overrides
  const streamReply = useCallback(async (history, coords, locData, voice = false) => {
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    const systemPrompt = buildCityContext(city, data, alerts ?? [], coords, locData)
      ;
    try {
      const gen = streamKimiChat(
        history.map(m => ({ role: m.role, content: m.content })),
        systemPrompt
      );
      for await (const token of gen) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + token,
          };
          return updated;
        });
      }
    } catch (e) {
      setError(e.message);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }, [city, data, alerts]);

  const sendMessage = useCallback(async (text, { voice = false } = {}) => {
    const userText = text.trim();
    if (!userText || streaming) return;

    const rateLimitMsg = checkRateLimit();
    if (rateLimitMsg) { setError(rateLimitMsg); return; }

    setError(null);
    setInput('');

    const userMsg  = { role: 'user', content: userText };
    const history  = [...messages, userMsg];

    // If question needs location and we don't have it yet — show inline prompt
    if (hasLocationIntent(userText) && !userCoords) {
      setMessages([...history, { role: 'location-prompt', content: userText }]);
      setPendingQuestion(userText);
      return;
    }

    setMessages(history);
    await streamReply(history, userCoords, userLocData, voice);
  }, [messages, streaming, userCoords, userLocData, streamReply]);

  // Called when user taps "Allow" on the inline location prompt
  const handleAllowLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setPendingQuestion(null);
      return;
    }
    setLocStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setLocStatus('granted');

        // Fetch live AQI + weather for user's exact GPS
        let locData = null;
        try {
          const [aqiRes, weatherRes] = await Promise.all([
            fetchAQI(coords.lat, coords.lon),
            fetchWeather(coords.lat, coords.lon),
          ]);
          locData = { aqi: aqiRes, weather: weatherRes };
          setUserLocData(locData);
        } catch { /* fall back to city data */ }

        // Remove the prompt bubble, then stream reply outside the updater
        setPendingQuestion(null);
        const withoutPrompt = messagesRef.current.filter(m => m.role !== 'location-prompt');
        setMessages(withoutPrompt);
        streamReply(withoutPrompt, coords, locData);
      },
      (err) => {
        setLocStatus('denied');
        setError(err.code === 1 ? 'Location denied. Enable it in browser settings.' : 'Could not get your location.');
        setPendingQuestion(null);
        const withoutPrompt = messagesRef.current.filter(m => m.role !== 'location-prompt');
        setMessages(withoutPrompt);
        streamReply(withoutPrompt, null, null);
        setTimeout(() => setLocStatus('idle'), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [pendingQuestion, streamReply]);

  // Called when user taps "Use City Data" — answer without GPS
  const handleSkipLocation = useCallback(() => {
    setPendingQuestion(null);
    const withoutPrompt = messagesRef.current.filter(m => m.role !== 'location-prompt');
    setMessages(withoutPrompt);
    streamReply(withoutPrompt, null, null);
  }, [streamReply]);

  const toggleVoice = useCallback(() => {
    // Stop if already listening
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input not supported. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'en-IN'; // Indian English
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceTranscript('');
      setError(null);
    };

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setVoiceTranscript(transcript);
      setInput(transcript);

      // Auto-send when speech is finalised
      if (e.results[e.results.length - 1].isFinal && transcript.trim()) {
        recognition.stop();
        setVoiceTranscript('');
        setInput('');
        sendMessage(transcript, { voice: true });
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      setVoiceTranscript('');
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        setError(`Voice error: ${e.error}. Try speaking again.`);
    };

    recognition.onend = () => {
      setListening(false);
      setVoiceTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasCritical = alerts?.some(a => a.severity === 'critical');

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chat-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              hasCritical 
                ? 'bg-gradient-to-tr from-semantic-red to-red-400 shadow-[0_8px_32px_rgba(239,68,68,0.5)] border border-red-300/30' 
                : 'bg-gradient-to-tr from-semantic-blue to-blue-400 shadow-[0_8px_32px_rgba(59,130,246,0.4)] border border-blue-300/30'
            }`}
          >
            <Bot size={24} className="text-white drop-shadow-md" />
            {hasCritical && (
              <motion.span 
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-bg-deep shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(4px)', transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`fixed z-50 flex flex-col overflow-hidden bg-bg-card/85 backdrop-blur-3xl border border-[#ffffff15] shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isExpanded 
                ? 'inset-3 md:inset-8 lg:inset-12 rounded-[32px]'
                : 'bottom-6 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-48px)] rounded-[24px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ffffff10] bg-gradient-to-b from-[#ffffff08] to-transparent shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-semantic-blue to-blue-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(59,130,246,0.3)]">
                <Sparkles size={16} className="text-white drop-shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-primary tracking-wide flex items-center gap-2">
                  CityAgent AI
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-semantic-blue/15 text-semantic-blue border border-semantic-blue/20 font-mono uppercase tracking-wider">Llama 3.1</span>
                </div>
                <div className="text-[11px] text-primary-muted mt-0.5 flex items-center gap-1.5 truncate">
                  <div className="w-1.5 h-1.5 rounded-full bg-semantic-green animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  {userCoords
                    ? <span className="text-emerald-400 font-mono">{userCoords.lat.toFixed(4)}°N {userCoords.lon.toFixed(4)}°E</span>
                    : <>{city?.name} · {data ? 'Live Data' : 'Initializing…'}</>
                  }
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button 
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsExpanded(!isExpanded)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary-muted hover:text-white transition-colors bg-black/20 border border-[#ffffff0a] shadow-inner"
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setOpen(false); setTimeout(() => setIsExpanded(false), 300); }} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-primary-muted hover:text-red-400 transition-colors bg-black/20 border border-[#ffffff0a] shadow-inner"
                >
                  <X size={14} />
                </motion.button>
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar px-4 py-6 flex flex-col gap-5 ${isExpanded ? 'items-center' : ''}`}>
              <div className={`flex flex-col gap-5 ${isExpanded ? 'w-full max-w-4xl px-4' : 'w-full'}`}>
                <AnimatePresence initial={false}>
                {messages.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                    className="flex flex-col items-center justify-center h-full gap-5 text-center px-4"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-semantic-blue/20 blur-xl rounded-full" />
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffffff10] to-[#ffffff05] border border-[#ffffff1a] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative z-10">
                        <Bot size={32} className="text-semantic-blue drop-shadow-lg" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white mb-2 tracking-wide drop-shadow-sm">How can I help with {city?.name}?</h3>
                      <p className="text-[12.5px] text-gray-300 font-medium leading-[1.6]">I instantly analyze live telemetry, anomalies, and social chatter to give you actionable insights.</p>
                    </div>
                    
                    
                    <div className={`flex gap-3 mt-4 w-full ${isExpanded ? 'flex-row justify-center max-w-3xl mx-auto' : 'flex-col'}`}>
                      {suggested.map((q, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => sendMessage(q)}
                          className={`text-left text-[12.5px] font-medium text-gray-300 hover:text-white bg-bg-inner/50 px-5 py-3.5 rounded-xl border border-[#ffffff0a] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all flex items-center justify-between group ${isExpanded ? 'flex-1' : ''}`}
                        >
                          <span className="leading-snug pr-2">{q}</span>
                          <ChevronDown size={14} className="opacity-0 group-hover:opacity-100 -rotate-90 text-semantic-blue transition-all shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {messages.map((msg, i) => {
                  // ── Inline location permission card ──────────────────
                  if (msg.role === 'location-prompt') {
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                        className="mr-auto max-w-[88%] bg-[#1a1e2e] border border-emerald-500/25 rounded-2xl rounded-tl-[4px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                      >
                        {/* Card header */}
                        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                            <LocateFixed size={15} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-white leading-none">Location access needed</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">To answer based on your exact area</p>
                          </div>
                        </div>

                        {/* What it will do */}
                        <div className="px-4 py-2">
                          <p className="text-[12px] text-gray-300 leading-relaxed">
                            I'll fetch <strong className="text-white">live AQI and weather</strong> for your exact GPS location and answer your question with real local data.
                          </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 px-4 pb-4 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleAllowLocation}
                            disabled={locStatus === 'fetching'}
                            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[12px] font-semibold shadow-[0_4px_12px_rgba(52,211,153,0.3)] transition-colors disabled:opacity-60"
                          >
                            {locStatus === 'fetching'
                              ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Fetching…</>
                              : <><MapPin size={13} /> Allow Location</>
                            }
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleSkipLocation}
                            disabled={locStatus === 'fetching'}
                            className="flex-1 flex items-center justify-center h-9 rounded-xl bg-[#ffffff08] hover:bg-[#ffffff12] border border-[#ffffff10] text-gray-300 text-[12px] font-medium transition-colors disabled:opacity-40"
                          >
                            Use city data
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  }

                  // ── Normal user / assistant bubble ───────────────────
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15, scale: 0.95, transformOrigin: isUser ? "bottom right" : "bottom left" }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex gap-3 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}`}
                    >
                      <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-md ${
                        isUser 
                          ? 'bg-gradient-to-br from-semantic-blue to-indigo-600 shadow-[inset_0_1px_rgba(255,255,255,0.3)]' 
                          : 'bg-gradient-to-br from-[#ffffff15] to-[#ffffff05] border border-[#ffffff1a] shadow-[inset_0_1px_rgba(255,255,255,0.1)]'
                      }`}>
                        {isUser 
                          ? <User size={13} className="text-white drop-shadow-sm" />
                          : <Sparkles size={13} className="text-semantic-blue drop-shadow-sm" />
                        }
                      </div>

                      <div className={`px-4 py-3.5 text-[13.5px] font-medium leading-[1.65] tracking-wide shadow-xl ${
                        isUser
                          ? 'bg-gradient-to-br from-semantic-blue to-blue-600 text-white rounded-2xl rounded-tr-[4px] shadow-[0_4px_16px_rgba(59,130,246,0.3),inset_0_1px_rgba(255,255,255,0.2)]'
                          : 'bg-[#1a1e28] text-gray-200 rounded-2xl rounded-tl-[4px] border border-[#ffffff10] shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_rgba(255,255,255,0.06)] text-left'
                      }`}>
                        {msg.content
                          ? renderText(msg.content)
                          : <div className="flex items-center h-full gap-1 px-1">
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.0 }} className="w-1.5 h-1.5 rounded-full bg-semantic-blue/60" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-semantic-blue/80" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-semantic-blue" />
                            </div>
                        }
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] font-medium text-red-200 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl shadow-[inset_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md"
                >
                  {error}
                </motion.div>
              )}

              {/* Follow-ups */}
              {messages.length > 0 && !streaming && messages.length < 5 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 mt-2 ml-10"
                >
                  {suggested.filter(q => !messages.some(m => m.content.includes(q.slice(0, 15)))).slice(0, 2).map((q, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendMessage(q)}
                      className="text-left text-[11px] font-medium text-primary-muted hover:text-primary bg-bg-inner/60 px-3 py-1.5 rounded-full border border-[#ffffff10] shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors"
                    >
                      {q}
                    </motion.button>
                  ))}
                </motion.div>
              )}
              <div ref={bottomRef} className="h-2" />
              </div>
            </div>

            {/* Input Area */}
            <div className={`shrink-0 p-4 bg-gradient-to-t from-bg-card via-bg-card to-transparent pt-6 relative z-10 ${isExpanded ? 'flex justify-center mb-4' : ''}`}>
              <div className={`relative group ${isExpanded ? 'w-full max-w-4xl' : 'w-full'}`}>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-semantic-blue to-[#a855f7] rounded-[18px] opacity-20 group-focus-within:opacity-40 blur transition duration-500" />
                <div className={`relative flex items-end gap-3 bg-[#161922] rounded-2xl border border-[#ffffff15] shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_rgba(255,255,255,0.08)] px-4 py-3 ${isExpanded ? 'py-4 px-5' : ''}`}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={listening ? voiceTranscript : input}
                    onChange={e => { if (!listening) setInput(e.target.value); }}
                    onKeyDown={handleKeyDown}
                    placeholder={listening ? '🎙 Listening… speak in English' : `Ask Kimi about ${city?.name}…`}
                    disabled={streaming || listening}
                    className={`flex-1 bg-transparent text-[14px] text-primary placeholder:text-primary-muted/50 resize-none outline-none min-h-[24px] max-h-[120px] py-1 leading-[1.6] disabled:opacity-50 custom-scrollbar ${isExpanded ? 'text-[15px]' : ''} ${listening ? 'placeholder:text-red-400/70' : ''}`}
                    style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                  />

                  {/* Voice button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleVoice}
                    disabled={streaming}
                    title={listening ? 'Stop recording' : 'Speak your question'}
                    className={`shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 ${isExpanded ? 'w-10 h-10' : 'w-8 h-8'} ${
                      listening
                        ? 'bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)] text-white'
                        : 'bg-[#ffffff0f] hover:bg-[#ffffff1a] text-primary-muted hover:text-primary border border-[#ffffff10]'
                    }`}
                  >
                    {listening
                      ? <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                          <MicOff size={15} className="text-white" />
                        </motion.div>
                      : <Mic size={15} />
                    }
                  </motion.button>

                  {/* Send button */}
                  <motion.button
                    whileHover={!streaming && input.trim() ? { scale: 1.1, backgroundColor: '#3b82f6' } : {}}
                    whileTap={!streaming && input.trim() ? { scale: 0.9 } : {}}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || streaming || listening}
                    className={`shrink-0 rounded-xl bg-semantic-blue flex items-center justify-center text-white shadow-[0_2px_10px_rgba(59,130,246,0.4),inset_0_1px_rgba(255,255,255,0.2)] disabled:opacity-30 disabled:shadow-none disabled:bg-[#ffffff15] disabled:text-primary-muted transition-all duration-300 ${isExpanded ? 'w-10 h-10' : 'w-8 h-8'}`}
                  >
                    <Send size={16} className={streaming || !input.trim() ? '' : 'translate-x-[1px] translate-y-[-1px] transition-transform'} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
