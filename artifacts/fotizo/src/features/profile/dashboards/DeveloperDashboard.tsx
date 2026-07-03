import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Code, Terminal, Key, Book, Copy, ExternalLink } from "lucide-react";
import { useDeveloperStats } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";

const apiData = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  calls: Math.floor(Math.random() * 5000) + 1000,
}));

export default function DashboardDeveloper() {
  const { data: developerStats } = useDeveloperStats();

  const sidebar = (
    <DashboardSidebar
      heading="Developer Hub"
      items={[
        { icon: <Terminal className="w-4 h-4" />, label: "Console", active: true },
        { icon: <Key className="w-4 h-4" />, label: "API Keys" },
        { icon: <Code className="w-4 h-4" />, label: "Webhooks" },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      {!developerStats ? (
        <Loading label="Loading console…" />
      ) : (
        <>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">API Console</h1>
              <p className="text-muted-foreground mt-1">Manage your Fotizo API integration.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2"><Book className="w-4 h-4" /> Docs</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="API Calls (30d)" value={developerStats.apiCalls.toLocaleString()} valueClassName="text-2xl font-mono" />
            <StatCard label="Error Rate" value={`${developerStats.errorRate}%`} valueClassName="text-2xl font-mono text-green-600" />
            <StatCard label="Avg Latency" value={`${developerStats.avgLatency}ms`} valueClassName="text-2xl font-mono" />
            <SurfaceCard className="p-6 bg-primary text-white border-primary">
              <p className="text-sm font-medium text-primary-foreground/80 mb-1">Current Plan</p>
              <h4 className="text-2xl font-bold">Pro</h4>
              <p className="text-xs text-primary-foreground/60 mt-1">{developerStats.rateLimit} req/min limit</p>
            </SurfaceCard>
          </div>

          <SurfaceCard className="p-6 mb-8">
            <h3 className="text-lg font-bold mb-6">API Requests (24h)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apiData}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dx={-10} />
                  <Tooltip cursor={{ stroke: "#cbd5e1" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* API Keys */}
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">API Keys</h3>
                <Button size="sm">Generate New Key</Button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { name: "Production App", key: "pk_live_*******************8a9b", date: "May 10" },
                  { name: "Staging Env", key: "pk_test_*******************2x4z", date: "Jun 02" },
                ].map((k, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
                    <div>
                      <p className="font-semibold text-sm mb-1">{k.name}</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">{k.key}</code>
                        <button className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">Revoke</Button>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {/* Webhooks */}
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold">Webhooks</h3>
                <Button size="sm" variant="outline">Add Endpoint</Button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { url: "https://api.myapp.com/webhooks/fotizo", events: "order.created, order.updated", status: "healthy" },
                  { url: "https://api.myapp.com/webhooks/payouts", events: "payout.paid", status: "healthy" },
                ].map((w, i) => (
                  <div key={i} className="flex flex-col gap-2 p-4 border border-border rounded-xl">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-sm truncate pr-4 flex items-center gap-2">
                        {w.url} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </p>
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Healthy</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{w.events}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
