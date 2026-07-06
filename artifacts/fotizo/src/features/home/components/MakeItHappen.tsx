import { Link } from "wouter";
import { LayoutGrid, SearchCheck, Zap, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";

const VALUE_PROPS = [
  { icon: LayoutGrid, text: "Access a pool of top talent and products across 100+ categories" },
  { icon: SearchCheck, text: "Enjoy a simple, easy-to-use matching experience" },
  { icon: Zap, text: "Get quality work done quickly and within budget" },
  { icon: HandCoins, text: "Only pay when you're happy" },
];

export function MakeItHappen() {
  return (
    <section className="py-20 bg-white">
      <div className="container-app">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Make it all happen with Fotizo
          </h2>
          <Link href="/signup">
            <Button className="rounded-full px-7 h-11 font-semibold shrink-0 w-fit">Join now</Button>
          </Link>
        </div>

        <hr className="mt-8 mb-12 border-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          {VALUE_PROPS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col gap-4">
              <Icon className="w-10 h-10 text-foreground" strokeWidth={1.25} aria-hidden="true" />
              <p className="text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
