import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Terminal, Key, Activity, Webhook, Database, CheckCircle2, XCircle } from "lucide-react";
import { AUTH_USE_MOCKS } from "@/api";
import { useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { useStaffQuery, Failure, NotAvailable } from "../components/Operations";
import { operationsService, type DeveloperStats } from "../services/operations.service";

type Section = "overview" | "usage" | "database" | "keys" | "webhooks";

const methodColor = (m: string) =>
  m === "GET" ? "text-blue-600" : m === "POST" ? "text-green-600" : m === "DELETE" ? "text-destructive" : "text-muted-foreground";
const statusTone = (s: number) => (s < 300 ? "success" : s < 500 ? "warning" : "danger");

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

function RequestLog({ stats }: { stats: DeveloperStats }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-bold">Recent requests</h3>
        <p className="text-xs text-muted-foreground">Last {stats.recent.length} requests to this server. Route patterns only; no IDs, queries or bodies.</p>
      </div>
      {stats.recent.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No requests recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Route</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Latency</th>
                <th className="px-6 py-3 font-medium text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border font-mono text-xs">
              {stats.recent.map((r, i) => (
                <tr key={`${r.at}-${i}`}>
                  <td className={`px-6 py-3 font-bold ${methodColor(r.method)}`}>{r.method}</td>
                  <td className="px-6 py-3">{r.route}</td>
                  <td className="px-6 py-3"><StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge></td>
                  <td className="px-6 py-3">{r.durationMs}ms</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{new Date(r.at).toLocaleTimeString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SurfaceCard>
  );
}

export default function DashboardDeveloper() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "usage", "database", "keys", "webhooks"],
    "overview",
  );
  const query = useStaffQuery(["developer-stats"], operationsService.developerStats);

  const sidebar = (
    <DashboardSidebar
      heading="Developer Hub"
      items={[
        { icon: <Terminal className="w-4 h-4" />, label: "Console", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Activity className="w-4 h-4" />, label: "Requests", active: section === "usage", onClick: () => setSection("usage") },
        { icon: <Database className="w-4 h-4" />, label: "Database", active: section === "database", onClick: () => setSection("database") },
        { icon: <Key className="w-4 h-4" />, label: "API Keys", active: section === "keys", onClick: () => setSection("keys") },
        { icon: <Webhook className="w-4 h-4" />, label: "Webhooks", active: section === "webhooks", onClick: () => setSection("webhooks") },
      ]}
    />
  );

  const stats = query.data;
  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="mb-8">
        <h1 className="heading-page text-foreground">API Console</h1>
        <p className="text-muted-foreground mt-1">
          Measured on this API process since it started. Figures reset when the server restarts.
        </p>
      </div>

      {AUTH_USE_MOCKS ? (
        <p role="status">Server statistics are unavailable in demo mode.</p>
      ) : query.isError ? (
        <Failure retry={() => void query.refetch()} label="Server statistics could not be loaded." />
      ) : !stats ? (
        <p role="status" className="text-muted-foreground">Loading server statistics…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Requests" value={stats.requests.toLocaleString()} valueClassName="text-2xl font-mono"
              sub={<p className="text-xs text-muted-foreground mt-2">Up {uptime(stats.uptimeSeconds)}</p>} />
            <StatCard label="Server error rate" value={`${stats.errorRate}%`} valueClassName="text-2xl font-mono"
              sub={<p className="text-xs text-muted-foreground mt-2">{stats.serverErrors} responses with status 5xx</p>} />
            <StatCard label="Avg latency" value={`${stats.avgLatencyMs}ms`} valueClassName="text-2xl font-mono" />
            <StatCard label="Database" value={stats.database.ready ? "Ready" : "Not ready"}
              valueClassName={`text-2xl font-mono ${stats.database.ready ? "text-green-600" : "text-destructive"}`}
              sub={<p className="text-xs text-muted-foreground mt-2">{stats.environment} · Node {stats.node}</p>} />
          </div>

          {section === "overview" && (
            <div className="space-y-8">
              <SurfaceCard className="p-6">
                <h3 className="text-lg font-bold mb-6">Requests per hour (last 24h)</h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.hourly.map((h) => ({ ...h, label: new Date(h.hour).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} minTickGap={30} />
                      <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} allowDecimals={false} />
                      <Tooltip cursor={{ stroke: chartColors.cursor }} contentStyle={chartTooltipStyle} />
                      <Area type="monotone" dataKey="requests" stroke={chartColors.primary} strokeWidth={2} fill={chartColors.primary} fillOpacity={0.15} />
                      <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
              <RequestLog stats={stats} />
            </div>
          )}

          {section === "usage" && <RequestLog stats={stats} />}

          {section === "database" && (
            <SurfaceCard className="p-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {stats.database.ready ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                )}
                Schema migrations
              </h3>
              {stats.database.migrations.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No migration ledger found. Databases created by schema push have none.
                </p>
              ) : (
                <ul className="mt-4 divide-y border-border text-sm">
                  {stats.database.migrations.map((m) => (
                    <li key={m.name} className="flex justify-between py-2">
                      <code className="font-mono">{m.name}</code>
                      <span className="text-muted-foreground">{new Date(m.appliedAt).toLocaleString("en-GB")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SurfaceCard>
          )}

          {section === "keys" && (
            <NotAvailable title="API keys are not available">
              Fotizo does not offer a public API yet, so no keys can be issued. Scoped, revocable
              credentials will be added once external API consumers are confirmed.
            </NotAvailable>
          )}
          {section === "webhooks" && (
            <NotAvailable title="Webhooks are not available">
              No outbound events are sent yet. Signed webhooks with delivery history are planned
              alongside the public API.
            </NotAvailable>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
