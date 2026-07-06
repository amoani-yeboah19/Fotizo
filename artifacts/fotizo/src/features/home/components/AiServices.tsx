import { Link } from "wouter";
import { Sparkles, Wand2, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CAPABILITIES = [
  { icon: Wand2, title: "AI-assisted briefs", desc: "Describe what you need in plain words — we shape it into a clear, hireable brief." },
  { icon: Search, title: "Smart matching", desc: "Get matched with the right professionals for your project in seconds." },
  { icon: Zap, title: "Faster delivery", desc: "AI-powered tools help pros produce quality work in less time." },
];

export function AiServices() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-[#F6F9FD]">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 sm:p-12 shadow-sm">
          <div className="absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full bg-[#FF6A00]/5 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -right-16 w-[360px] h-[360px] rounded-full bg-[#08275B]/5 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FF6A00]/10 px-3 py-1 text-sm font-semibold text-[#FF6A00]">
              <Sparkles className="w-4 h-4" aria-hidden="true" /> Powered by AI
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-xl">
              Get things done faster with Fotizo AI
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg leading-relaxed">
              From finding the right pro to shaping your project, our AI helps you move from idea to
              done — faster and with less back-and-forth.
            </p>

            <div className="mt-9 grid grid-cols-1 md:grid-cols-3 gap-8">
              {CAPABILITIES.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.title} className="flex flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-9">
              <Link href="/services">
                <Button className="rounded-full px-7 h-12 font-semibold gap-2">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> Try Fotizo AI
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
