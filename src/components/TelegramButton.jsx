import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendTelegramUpdate } from '../api/telegram';

const AUTO_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Telegram paper-plane icon (SVG, matches the brand)
function TelegramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

export default function TelegramButton({ city, data, alerts }) {
  const [status, setStatus]     = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(AUTO_INTERVAL_MS / 1000);
  const [autoEnabled, setAutoEnabled] = useState(true);

  // Manual send
  const handleSend = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await sendTelegramUpdate(city, data, alerts);
      setStatus('sent');
      setCountdown(AUTO_INTERVAL_MS / 1000); // reset countdown
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  // Auto-send every 5 minutes + countdown
  useEffect(() => {
    if (!autoEnabled || !data) return;

    // Countdown tick
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return AUTO_INTERVAL_MS / 1000;
        return prev - 1;
      });
    }, 1000);

    // Auto-send trigger
    const send = setInterval(() => {
      sendTelegramUpdate(city, data, alerts).catch(() => {});
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 2000);
    }, AUTO_INTERVAL_MS);

    return () => { clearInterval(tick); clearInterval(send); };
  }, [autoEnabled, city, data, alerts]);

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0');
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Auto-send countdown pill */}
      {autoEnabled && data && (
        <div
          className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-primary-muted bg-bg-inner border border-[#ffffff10] rounded-md px-2 h-7 cursor-pointer hover:border-[#229ED9]/40 hover:text-[#229ED9] transition-colors"
          title="Click to toggle auto-send"
          onClick={() => setAutoEnabled(v => !v)}
        >
          <div className="w-1 h-1 rounded-full bg-[#229ED9] animate-pulse" />
          {mins}:{secs}
        </div>
      )}

      {/* Manual send button */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSend}
        disabled={status === 'sending' || !data}
        title="Send update to @cityagentdh on Telegram"
        className={`flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-semibold transition-all shrink-0 ${
          status === 'sending' ? 'border-[#229ED9]/40 text-[#229ED9] bg-[#229ED9]/10 cursor-wait' :
          status === 'sent'    ? 'border-green-500/40 text-green-400 bg-green-500/10' :
          status === 'error'   ? 'border-red-500/40 text-red-400 bg-red-500/10' :
          'border-[#ffffff12] text-primary-muted hover:text-[#229ED9] hover:border-[#229ED9]/40 hover:bg-[#229ED9]/5'
        }`}
      >
        <TelegramIcon size={13} />
        <span className="hidden md:block">
          {status === 'sending' ? 'Sending…' :
           status === 'sent'    ? 'Sent ✓' :
           status === 'error'   ? 'Failed' :
           'Send Update'}
        </span>
      </motion.button>

      {/* Error tooltip */}
      <AnimatePresence>
        {status === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-14 right-4 z-[999] bg-red-900/80 text-red-200 text-[10px] px-3 py-2 rounded-lg border border-red-500/30 max-w-[260px] backdrop-blur-md shadow-xl"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
