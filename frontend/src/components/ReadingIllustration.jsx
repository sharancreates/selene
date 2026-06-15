import React from 'react';

export default function ReadingIllustration() {
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Open book pages */}
      <path d="M50 75 C35 70, 20 72, 10 75 L10 35 C20 32, 35 30, 50 35 Z" fill="rgba(223, 155, 109, 0.1)" />
      <path d="M50 75 C65 70, 80 72, 90 75 L90 35 C80 32, 65 30, 50 35 Z" fill="rgba(223, 155, 109, 0.1)" />
      <path d="M50 35 L50 75" />
      {/* Book Binding/Ribbon */}
      <path d="M50 75 C50 82, 53 85, 50 88" />
      {/* Botanical branches sprouting from the book */}
      <path d="M50 35 Q55 20, 65 15" stroke="#8ca090" />
      <path d="M50 35 Q45 22, 38 18" stroke="#8ca090" />
      {/* Small leaves on branches */}
      <path d="M65 15 Q68 12, 64 10 Q60 12, 65 15 Z" fill="#8ca090" stroke="#8ca090" />
      <path d="M38 18 Q35 15, 39 12 Q42 15, 38 18 Z" fill="#8ca090" stroke="#8ca090" />
      <path d="M55 25 Q58 23, 56 20 C54 22, 55 25, 55 25 Z" fill="#8ca090" stroke="#8ca090" />
      {/* Sparkles/Stars */}
      <path d="M25 22 L27 24 L25 26 L23 24 Z" fill="#dfbe7e" stroke="none" />
      <path d="M75 25 L77 27 L75 29 L73 27 Z" fill="#dfbe7e" stroke="none" />
    </svg>
  );
}
