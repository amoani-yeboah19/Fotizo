import { Link } from "wouter";
import { PackageSearch, LifeBuoy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Customer service on the home page. Deliberately placed after the product and
// service sections: someone chasing a missing package scrolls looking for help,
// and until now the site gave them nowhere to land.
const POINTS = [
  {
    icon: PackageSearch,
    title: "Track an order",
    body: "See where your parcel is and what the expected window was.",
  },
  {
    icon: RotateCcw,
    title: "Returns & refunds",
    body: "Damaged, wrong or never arrived — buyer protection covers every order.",
  },
  {
    icon: LifeBuoy,
    title: "Talk to a person",
    body: "Raise an issue and a real member of the team picks it up.",
  },
];

export function SupportBand() {
  return (
    <section className="bg-muted/40 py-16">
      <div className="container-app">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              Something gone wrong?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Orders cross borders, and occasionally something goes astray. When it does, you get a
              person — not a bot and not a dead end.
            </p>
            <Link href="/support">
              <Button size="lg" className="mt-6 rounded-full px-7">
                Get help
              </Button>
            </Link>
          </div>

          <ul className="grid flex-1 gap-4 sm:grid-cols-3 lg:max-w-2xl">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-border bg-white p-5">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
