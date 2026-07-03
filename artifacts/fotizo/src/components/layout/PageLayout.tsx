import { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

// Standard page shell: Navbar + main + (optional) Footer.
export function PageLayout({
  children,
  mainClassName,
  footer = true,
}: {
  children: ReactNode;
  mainClassName?: string;
  footer?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      {footer && <Footer />}
    </div>
  );
}
