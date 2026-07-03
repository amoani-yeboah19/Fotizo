import { motion } from "framer-motion";
import { Star, ShieldCheck, Zap } from "lucide-react";

const FLOATING_BADGES = [
  {
    icon: <ShieldCheck className="w-4 h-4 text-green-600" />,
    text: "Verified seller",
    sub: "100% authenticated",
    position: "top-[12%] right-[5%]",
    delay: 0.6,
  },
  {
    icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />,
    text: "Top rated",
    sub: "4.9 average",
    position: "bottom-[28%] right-[2%]",
    delay: 0.8,
  },
  {
    icon: <Zap className="w-4 h-4 text-accent" />,
    text: "Fast delivery",
    sub: "Ships in 24h",
    position: "bottom-[10%] left-[4%]",
    delay: 1.0,
  },
];

// The right-hand hero visual: product image card, floating badges, live-activity pill.
export function HeroImagePanel() {
  return (
    <div className="relative hidden lg:flex items-center justify-center h-full min-h-[600px]">
      {/* Main product image on navy bg */}
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[340px] xl:w-[400px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
      >
        <img
          loading="eager"
          decoding="async"
          fetchPriority="high"
          src="/images/hero.webp"
          alt="Premium marketplace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08275B]/50 via-transparent to-transparent" />

        {/* bottom overlay card */}
        <div className="absolute bottom-5 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <img loading="lazy" decoding="async" src="/images/avatar-1.webp" alt="seller" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">Sony WH-1000XM5</p>
              <p className="text-xs text-muted-foreground">by Sony Official · Electronics</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">£348</p>
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating badges */}
      {FLOATING_BADGES.map((b) => (
        <motion.div
          key={b.text}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: b.delay }}
          className={`absolute ${b.position} bg-white rounded-2xl px-4 py-3 shadow-xl border border-border/50 flex items-center gap-3`}
        >
          <div className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center shrink-0">
            {b.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">{b.text}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{b.sub}</p>
          </div>
        </motion.div>
      ))}

      {/* Live activity badge */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="absolute top-[50%] -left-[60px] xl:-left-[80px] bg-[#08275B] text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        <div>
          <p className="text-[10px] font-semibold leading-none opacity-80">LIVE</p>
          <p className="text-xs font-bold mt-0.5">847 active</p>
        </div>
      </motion.div>
    </div>
  );
}
