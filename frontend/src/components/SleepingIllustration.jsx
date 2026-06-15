import React from 'react';

export default function SleepingIllustration() {
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Crescent Moon */}
      <path d="M65 25 C50 25, 38 37, 38 52 C38 67, 50 79, 65 79 C53 79, 45 70, 45 52 C45 34, 53 25, 65 25 Z" fill="rgba(157, 142, 166, 0.2)" stroke="#9d8ea6" />
      {/* Clouds */}
      <path d="M20 70 C20 62, 30 60, 35 65 C40 60, 52 62, 52 70 C52 75, 20 75, 20 70 Z" fill="rgba(255, 255, 255, 0.4)" />
      {/* Stars */}
      <path d="M30 35 L32 37 L30 39 L28 37 Z" fill="#dfbe7e" stroke="none" />
      <path d="M75 45 L76 46 L75 47 L74 46 Z" fill="#dfbe7e" stroke="none" />
      <path d="M55 40 L57 42 L55 44 L53 42 Z" fill="#dfbe7e" stroke="none" />
      {/* Sleep Zzz's */}
      <path d="M48 48 L54 48 L48 54 L54 54" strokeWidth="1" />
      <path d="M58 38 L62 38 L58 42 L62 42" strokeWidth="1" />
    </svg>
  );
}
