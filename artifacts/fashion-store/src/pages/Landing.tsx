import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { GlitchText } from '@/components/GlitchText';
import { FilmGrain } from '@/components/FilmGrain';
import { motion } from 'framer-motion';

export function Landing() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const enter = () => {
    localStorage.setItem('intro-seen', 'true');
    setLocation('/');
  };

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => enter();
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <FilmGrain opacity={0.06} />
      <div className="scan-line" />

      <button
        onClick={enter}
        className="fixed top-8 right-8 z-50 font-sans text-xs uppercase tracking-widest hover:text-white/60 transition-colors"
      >
        Skip
      </button>

      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <GlitchText
            text="CLIQBAIT"
            active={true}
            dark={true}
            className="font-display text-[13vw] leading-none font-bold uppercase tracking-tighter text-white"
          />
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="h-[2px] w-[80vw] max-w-4xl bg-white mt-4 origin-left"
        />

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: 1 }}
          onClick={enter}
          className="pointer-events-auto mt-12 font-sans text-sm uppercase tracking-[0.4em] border border-white px-12 py-4 hover:bg-white hover:text-black transition-colors"
        >
          Enter
        </motion.button>
      </div>
    </div>
  );
}
