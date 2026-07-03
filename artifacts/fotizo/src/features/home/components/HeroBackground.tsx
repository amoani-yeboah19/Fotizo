// Decorative background layers for the hero (grid, navy panel, dot pattern, hero image).
export function HeroBackground() {
  return (
    <>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#08275B 1px, transparent 1px), linear-gradient(90deg, #08275B 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Navy accent blob — top-right */}
      <div className="absolute top-0 right-0 w-[55%] h-[90%] z-0 rounded-bl-[80px] overflow-hidden">
        <div className="absolute inset-0 bg-[#08275B]" />
        {/* subtle dot pattern over navy */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* hero product image fills the navy panel */}
        <img
          loading="eager"
          decoding="async"
          fetchPriority="high"
          src="/images/hero.webp"
          alt="Premium marketplace"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
        />
      </div>
    </>
  );
}
