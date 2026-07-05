import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Code, Terminal, Key, Book, Copy, ExternalLink, Webhook, ListTree, Activity, CheckCircle2,
} from "lucide-react";
import { useDeveloperStats } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading } from "@/components/common/QueryStates";
import { StatusBadge } from "@/components/common/StatusBadge";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";

type Section = "overview" | "keys" | "usage" | "webhooks" | "endpoints";

const apiData = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  calls: Math.floor(Math.random() * 5000) + 1000,
}));

const API_KEYS = [
  { name: "Production App", key: "pk_live_*******************8a9b", date: "May 10" },
  { name: "Staging Env", key: "pk_test_*******************2x4z", date: "Jun 02" },
];

const WEBHOOKS = [
  { url: "https://api.myapp.com/webhooks/fotizo", events: "order.created, order.updated", status: "healthy" },
  { url: "https://api.myapp.com/webhooks/payouts", events: "payout.paid", status: "healthy" },
];

const ENDPOINTS = [
  { method: "GET", path: "/v1/products", desc: "List products" },
  { method: "POST", path: "/v1/products", desc: "Create a product" },
  { method: "GET", path: "/v1/services", desc: "List services" },
  { method: "POST", path: "/v1/orders", desc: "Place an order" },
  { method: "GET", path: "/v1/orders/:id", desc: "Retrieve an order" },
  { method: "POST", path: "/v1/webhooks", desc: "Register a webhook" },
];

const METHODS = ["GET", "POST", "GET", "POST", "DELETE", "GET", "POST", "GET"];
const PATHS = ["/v1/products", "/v1/orders", "/v1/services/42", "/v1/orders", "/v1/keys/9", "/v1/products/7", "/v1/webhooks", "/v1/orders/88"];
const STATUSES = [200, 201, 200, 400, 204, 200, 500, 200];
const RECENT_REQUESTS = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  method: METHODS[i],
  path: PATHS[i],
  status: STATUSES[i],
  latency: Math.floor(Math.random() * 180) + 40,
  time: `${i * 3 + 1}s ago`,
}));

const methodColor = (m: string) =>
  m === "GET" ? "text-blue-600" : m === "POST" ? "text-green-600" : m === "DELETE" ? "text-destructive" : "text-muted-foreground";
const statusTone = (s: number) => (s < 300 ? "success" : s < 500 ? "warning" : "danger");

function ApiKeysPanel() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">API Keys</h3>
        <Button size="sm">Generate New Key</Button>
      </div>
      <div className="p-6 space-y-4">
        {API_KEYS.map((k, i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="font-semibold text-sm mb-1">{k.name}</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">{k.key}</code>
                <button aria-label={`Copy ${k.name} API key`} className="text-muted-foreground hover:text-foreground"><Copy aria-hidden="true" className="w-3 h-3" /></button>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive">Revoke</Button>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function WebhooksPanel() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">Webhooks</h3>
        <Button size="sm" variant="outline">Add Endpoint</Button>
      </div>
      <div className="p-6 space-y-4">
        {WEBHOOKS.map((w, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 border border-border rounded-xl">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-sm truncate pr-4 flex items-center gap-2">{w.url} <ExternalLink className="w-3 h-3 text-muted-foreground" /></p>
              <StatusBadge tone="success">Healthy</StatusBadge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{w.events}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function RequestLog() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border"><h3 className="text-lg font-bold">Recent Requests</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Endpoint</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Latency</th>
              <th className="px-6 py-3 font-medium text-right">When</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border font-mono text-xs">
            {RECENT_REQUESTS.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className={`px-6 py-3 font-bold ${methodColor(r.method)}`}>{r.method}</td>
                <td className="px-6 py-3">{r.path}</td>
                <td className="px-6 py-3"><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td>
                <td className="px-6 py-3">{r.latency}ms</td>
                <td className="px-6 py-3 text-right text-muted-foreground">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

export default function DashboardDeveloper() {
  const { data: developerStats } = useDeveloperStats();
  const [section, setSection] = useState<Section>("overview");

  const sidebar = (
    <DashboardSidebar
      heading="Developer Hub"
      items={[
        { icon: <Terminal className="w-4 h-4" />, label: "Console", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Key className="w-4 h-4" />, label: "API Keys", active: section === "keys", onClick: () => setSection("keys") },
        { icon: <Activity className="w-4 h-4" />, label: "Usage & Logs", active: section === "usage", onClick: () => setSection("usage") },
        { icon: <Webhook className="w-4 h-4" />, label: "Webhooks", active: section === "webhooks", onClick: () => setSection("webhooks") },
        { icon: <ListTree className="w-4 h-4" />, label: "Endpoints", active: section === "endpoints", onClick: () => setSection("endpoints") },
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
              <h1 className="heading-page text-foreground">API Console</h1>
              <p className="text-muted-foreground mt-1">Everything happening across your Fotizo integration.</p>
            </div>
            <Button variant="outline" className="gap-2"><Book className="w-4 h-4" /> Docs</Button>
          </div>

          {/* Stat row — shown on every panel for constant visibility */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="API Calls (30d)" value={developerStats.apiCalls.toLocaleString()} valueClassName="text-2xl font-mono" />
            <StatCard label="Error Rate" value={`${developerStats.errorRate}%`} valueClassName="text-2xl font-mono text-green-600" />
            <StatCard label="Avg Latency" value={`${developerStats.avgLatency}ms`} valueClassName="text-2xl font-mono" />
            <StatCard label="Webhooks Delivered" value={developerStats.webhooksDelivered.toLocaleString()} valueClassName="text-2xl font-mono" />
          </div>

          {section === "overview" && (
            <>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} />
                      <Tooltip cursor={{ stroke: chartColors.cursor }} contentStyle={chartTooltipStyle} />
                      <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2"><RequestLog /></div>
                <SurfaceCard className="p-6">
                  <h3 className="text-lg font-bold mb-4">System Status</h3>
                  <div className="space-y-3">
                    {["API", "Webhooks", "Payments", "Dashboard"].map((s) => (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s}</span>
                        <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Operational
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl bg-primary/5 p-4">
                    <p className="text-sm font-medium text-primary">Plan: Pro</p>
                    <p className="text-xs text-muted-foreground mt-1">{developerStats.rateLimit.toLocaleString()} req/min · {developerStats.activeKeys} active keys</p>
                  </div>
                </SurfaceCard>
              </div>
            </>
          )}

          {section === "keys" && <ApiKeysPanel />}
          {section === "usage" && <RequestLog />}
          {section === "webhooks" && <WebhooksPanel />}
          {section === "endpoints" && (
            <SurfaceCard className="overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-lg font-bold">API Reference</h3>
              </div>
              <ul className="divide-y border-border">
                {ENDPOINTS.map((e) => (
                  <li key={`${e.method}${e.path}`} className="flex items-center gap-4 px-6 py-4">
                    <span className={`w-16 shrink-0 font-mono text-xs font-bold ${methodColor(e.method)}`}>{e.method}</span>
                    <code className="font-mono text-sm text-foreground">{e.path}</code>
                    <span className="ml-auto text-sm text-muted-foreground hidden sm:block">{e.desc}</span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
