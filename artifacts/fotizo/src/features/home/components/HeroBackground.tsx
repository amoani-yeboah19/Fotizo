// Subtle, on-brand decorative backdrop for the hero. Soft navy + orange glows, a
// faint dot texture, a dashed orbit, a network motif and scattered brand nodes fill
// the empty left space and tie the section to Fotizo's palette — all low-opacity so
// the copy stays crisp. Vector decoration is hidden on phones to keep mobile clean.
export function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* base wash — a whisper of colour instead of flat white */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#F4F8FD] to-white" />

      {/* faint dot grid — reads as texture, fades toward the centre */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #08275B 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.06,
          maskImage: "radial-gradient(130% 120% at 50% 35%, black 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(130% 120% at 50% 35%, black 0%, transparent 72%)",
        }}
      />

      {/* soft navy glow — top-left, behind the headline */}
      <div className="absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full bg-[#08275B]/8 blur-3xl" />

      {/* warm orange glow — lower-left, near the CTAs */}
      <div className="absolute top-1/2 -left-28 w-[440px] h-[440px] rounded-full bg-[#FF6A00]/6 blur-3xl" />

      {/* navy "stage" glow — behind the photo on the right */}
      <div className="absolute top-8 -right-32 w-[640px] h-[640px] rounded-full bg-[#08275B]/5 blur-3xl" />

      {/* dashed orbit rings — top-left, mostly off-canvas */}
      <svg
        className="absolute -top-44 -left-36 w-[560px] h-[560px] hidden sm:block"
        viewBox="0 0 560 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="280" cy="280" r="250" stroke="#08275B" strokeOpacity="0.09" strokeWidth="1.5" strokeDasharray="2 12" />
        <circle cx="280" cy="280" r="185" stroke="#FF6A00" strokeOpacity="0.07" strokeWidth="1.5" />
        <circle cx="280" cy="30" r="5" fill="#FF6A00" fillOpacity="0.4" />
        <circle cx="500" cy="215" r="4" fill="#08275B" fillOpacity="0.25" />
      </svg>

      {/* network motif — nodes + links across the upper-left */}
      <svg
        className="absolute top-24 left-4 w-[400px] h-[320px] hidden sm:block"
        viewBox="0 0 400 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#08275B" strokeOpacity="0.12" strokeWidth="1.5">
          <line x1="40" y1="70" x2="190" y2="30" />
          <line x1="190" y1="30" x2="340" y2="100" />
          <line x1="40" y1="70" x2="120" y2="230" />
          <line x1="120" y1="230" x2="320" y2="260" />
          <line x1="340" y1="100" x2="320" y2="260" />
          <line x1="190" y1="30" x2="120" y2="230" />
        </g>
        <g>
          <circle cx="40" cy="70" r="4.5" fill="#08275B" fillOpacity="0.25" />
          <circle cx="190" cy="30" r="6" fill="#FF6A00" fillOpacity="0.45" />
          <circle cx="340" cy="100" r="4.5" fill="#08275B" fillOpacity="0.25" />
          <circle cx="120" cy="230" r="4.5" fill="#08275B" fillOpacity="0.25" />
          <circle cx="320" cy="260" r="5.5" fill="#FF6A00" fillOpacity="0.4" />
        </g>
      </svg>

      {/* small constellation — lower-left, near the CTAs / features */}
      <svg
        className="absolute bottom-24 left-12 w-[240px] h-[170px] hidden lg:block"
        viewBox="0 0 240 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="#08275B" strokeOpacity="0.1" strokeWidth="1.2">
          <line x1="20" y1="130" x2="95" y2="55" />
          <line x1="95" y1="55" x2="195" y2="95" />
        </g>
        <circle cx="20" cy="130" r="3.5" fill="#08275B" fillOpacity="0.22" />
        <circle cx="95" cy="55" r="4.5" fill="#FF6A00" fillOpacity="0.4" />
        <circle cx="195" cy="95" r="3.5" fill="#08275B" fillOpacity="0.22" />
      </svg>
    </div>
  );
}
