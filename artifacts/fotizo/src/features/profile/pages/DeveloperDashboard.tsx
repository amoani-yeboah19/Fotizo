import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Code, Terminal, Key, Book, Copy, ExternalLink, Webhook, ListTree, Activity, CheckCircle2,
} from "lucide-react";
import { useDashboardSection } from "@/features/profile/hooks";
import { useStaffQuery } from "@/features/profile/components/Operations";
import { operationsService, type DeveloperStats } from "@/features/profile/services/operations.service";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading } from "@/components/common/QueryStates";
import { StatusBadge } from "@/components/common/StatusBadge";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";

type Section = "overview" | "keys" | "usage" | "webhooks" | "endpoints";

// Statistics are measured by this API process since it started (GET
// /api/developer/stats). Fotizo issues no API keys and sends no webhooks yet,
// so those lists are empty rather than illustrative.
const API_KEYS: { name: string; key: string; date: string }[] = [];
const WEBHOOKS: { url: string; events: string; status: string }[] = [];

// Public endpoints this API actually serves.
const ENDPOINTS = [
  { method: "GET", path: "/api/products", desc: "List published products" },
  { method: "GET", path: "/api/products/:id", desc: "Retrieve a product" },
  { method: "GET", path: "/api/services", desc: "List services" },
  { method: "GET", path: "/api/vehicles", desc: "List published vehicles" },
  { method: "POST", path: "/api/support-requests", desc: "Open a support request" },
  { method: "POST", path: "/api/vehicle-enquiries", desc: "Send a vehicle enquiry" },
  { method: "GET", path: "/api/currency/rates", desc: "Display exchange rates" },
];

const ago = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
};
type RequestRow = { id: number; method: string; path: string; status: number; latency: number; time: string };
const requestRows = (stats: DeveloperStats): RequestRow[] =>
  stats.recent.map((r, i) => ({
    id: i,
    method: r.method,
    path: r.route,
    status: r.status,
    latency: r.durationMs,
    time: ago(r.at),
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
        {API_KEYS.length === 0 && <p className="text-sm text-muted-foreground">No API keys have been issued.</p>}
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
        {WEBHOOKS.length === 0 && <p className="text-sm text-muted-foreground">No webhook endpoints are registered.</p>}
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

function RequestLog({ rows }: { rows: RequestRow[] }) {
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
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-3 text-muted-foreground">No requests recorded yet.</td></tr>
            )}
            {rows.map((r) => (
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
  const { data: stats } = useStaffQuery(["developer-stats"], operationsService.developerStats);
  const developerStats = stats && {
    apiCalls: stats.requests,
    errorRate: stats.errorRate,
    avgLatency: stats.avgLatencyMs,
    webhooksDelivered: 0,
  };
  const apiData = (stats?.hourly ?? []).map((h) => ({
    time: new Date(h.hour).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    calls: h.requests,
  }));
  const recentRows = stats ? requestRows(stats) : [];
  const systemStatus = [
    { name: "API", ok: true, label: "Operational" },
    { name: "Database", ok: stats?.database.ready ?? false, label: stats?.database.ready ? "Operational" : "Not ready" },
    { name: "Webhooks", ok: false, label: "Not configured" },
    { name: "Payments", ok: false, label: "Not configured" },
  ];
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "keys", "usage", "webhooks", "endpoints"],
    "overview",
  );

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
            <StatCard label="API Calls" value={developerStats.apiCalls.toLocaleString()} valueClassName="text-2xl font-mono" />
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
                <div className="lg:col-span-2"><RequestLog rows={recentRows} /></div>
                <SurfaceCard className="p-6">
                  <h3 className="text-lg font-bold mb-4">System Status</h3>
                  <div className="space-y-3">
                    {systemStatus.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className={`inline-flex items-center gap-1.5 font-medium ${s.ok ? "text-green-600" : "text-muted-foreground"}`}>
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl bg-primary/5 p-4">
                    <p className="text-sm font-medium text-primary">Environment: {stats?.environment}</p>
                    <p className="text-xs text-muted-foreground mt-1">Node {stats?.node} · {API_KEYS.length} active keys</p>
                  </div>
                </SurfaceCard>
              </div>
            </>
          )}

          {section === "keys" && <ApiKeysPanel />}
          {section === "usage" && <RequestLog rows={recentRows} />}
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
