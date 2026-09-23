import { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";


// Dashboard shell. Owns the auth guard so individual dashboards no longer repeat it.
export function DashboardLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row pt-20">
        {sidebar}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
