import { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";


// Keep navigation outside the main scroll region. Route guards own authentication.
export function DashboardLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 min-h-0 flex flex-col md:flex-row pt-20">
        {sidebar}
        <main tabIndex={0} aria-label="Dashboard content" className="flex-1 min-h-0 min-w-0 p-4 lg:p-8 overflow-y-auto overscroll-y-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
