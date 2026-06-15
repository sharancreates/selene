import React from 'react';

export default function TeaIllustration() {
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 text-[var(--color-selene-brown)] mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Tea Cup */}
      <path d="M30 45 C30 70, 70 70, 70 45 Z" fill="rgba(223, 155, 109, 0.15)" />
      <path d="M30 45 L70 45" />
      {/* Cup Handle */}
      <path d="M70 50 C78 50, 78 60, 70 60" />
      {/* Steam rising */}
      <path d="M40 35 Q43 28, 40 20" />
      <path d="M50 37 Q53 25, 49 18" />
      <path d="M60 35 Q63 28, 60 20" />
      {/* Saucer */}
      <path d="M25 72 L75 72" />
      {/* Small botanical leaf motif */}
      <path d="M15 50 Q22 45, 20 35 Q12 40, 15 50 Z" fill="rgba(140, 160, 144, 0.2)" stroke="#8ca090" />
      <path d="M15 50 L20 35" stroke="#8ca090" />
    </svg>
  );
}
