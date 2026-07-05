import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { Users, Activity, ShieldAlert } from "lucide-react";
import { useManagerMetrics } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading } from "@/components/common/QueryStates";
import { StatusBadge } from "@/components/common/StatusBadge";
import { chartColors, chartAxisTick, chartTooltipStyle } from "@/constants/chart";
import { Button } from "@/components/ui/button";

type Section = "overview" | "users" | "moderation";

const activityData = [
  { name: "Mon", signups: 120 }, { name: "Tue", signups: 200 }, { name: "Wed", signups: 150 },
  { name: "Thu", signups: 280 }, { name: "Fri", signups: 350 }, { name: "Sat", signups: 420 }, { name: "Sun", signups: 380 },
];

const mockUsers = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "seller", status: "active", date: "2026-06-10" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "buyer", status: "active", date: "2026-06-11" },
  { id: 3, name: "Charlie Davis", email: "charlie@example.com", role: "developer", status: "pending", date: "2026-06-12" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "buyer", status: "suspended", date: "2026-06-12" },
  { id: 5, name: "Ethan Hunt", email: "ethan@example.com", role: "seller", status: "active", date: "2026-06-13" },
];

const subText = (text: string) => <p className="text-xs text-muted-foreground mt-2">{text}</p>;
const userTone = (s: string) => (s === "active" ? "success" : s === "pending" ? "warning" : "danger");

function UsersTable() {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">Recent Signups</h3>
        <Button variant="outline" size="sm">Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {mockUsers.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-6 py-4">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-6 py-4"><span className="capitalize">{u.role}</span></td>
                <td className="px-6 py-4 text-muted-foreground">{u.date}</td>
                <td className="px-6 py-4"><StatusBadge tone={userTone(u.status)}>{u.status}</StatusBadge></td>
                <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm">Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function ModerationQueue({ count }: { count: number }) {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-bold">Moderation Queue</h3>
        <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full font-bold">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-semibold">Flagged Review #{i}</p>
              <span className="text-[10px] text-muted-foreground">2h ago</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              "This product arrived completely broken and the seller refused to..."
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive hover:bg-destructive hover:text-white">Remove</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1">Approve</Button>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export default function DashboardManager() {
  const { data: managerMetrics } = useManagerMetrics();
  const [section, setSection] = useState<Section>("overview");

  const sidebar = (
    <DashboardSidebar
      heading="Admin Console"
      items={[
        { icon: <Activity className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Users className="w-4 h-4" />, label: "Users", active: section === "users", onClick: () => setSection("users") },
        { icon: <ShieldAlert className="w-4 h-4" />, label: "Moderation", active: section === "moderation", onClick: () => setSection("moderation") },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      {!managerMetrics ? (
        <Loading label="Loading dashboard…" />
      ) : (
        <>
          <header className="mb-8">
            <h1 className="heading-page text-foreground">
              {section === "overview" ? "Platform Manager" : section === "users" ? "Users" : "Moderation"}
            </h1>
            <p className="text-muted-foreground mt-1">System overview and moderation tools.</p>
          </header>

          {section === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Users" value={managerMetrics.totalUsers.toLocaleString()} sub={subText(`${managerMetrics.newUsersThisMonth} new this month`)} />
                <StatCard label="Revenue (MTD)" value={`£${(managerMetrics.revenueThisMonth / 1000).toFixed(1)}k`} sub={subText("Platform fees")} />
                <StatCard label="Active Listings" value={managerMetrics.activeListings.toLocaleString()} sub={subText("Products & Services")} />
                <StatCard label="Open Tickets" value={managerMetrics.openTickets} valueClassName="text-destructive" sub={subText("Support queue")} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <SurfaceCard className="lg:col-span-2 p-6">
                  <h3 className="text-lg font-bold mb-6">User Acquisition</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartAxisTick} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={chartAxisTick} dx={-10} />
                        <RechartsTooltip cursor={{ stroke: chartColors.grid }} contentStyle={chartTooltipStyle} />
                        <Line type="monotone" dataKey="signups" stroke={chartColors.primary} strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SurfaceCard>

                <SurfaceCard className="p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Moderation</h3>
                      <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full font-bold">{managerMetrics.flaggedContent}</span>
                    </div>
                    <Button variant="link" className="p-0" onClick={() => setSection("moderation")}>View all</Button>
                  </div>
                  <div className="space-y-4 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-border rounded-xl p-3">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-semibold">Flagged Review #{i}</p>
                          <span className="text-[10px] text-muted-foreground">2h ago</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">"This product arrived completely broken and the seller refused to..."</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive hover:bg-destructive hover:text-white">Remove</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1">Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              </div>

              <UsersTable />
            </>
          )}

          {section === "users" && <UsersTable />}
          {section === "moderation" && <ModerationQueue count={managerMetrics.flaggedContent} />}
        </>
      )}
    </DashboardLayout>
  );
}
