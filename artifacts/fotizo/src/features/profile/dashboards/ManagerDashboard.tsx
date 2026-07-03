import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, Activity, ShieldAlert } from "lucide-react";
import { useManagerMetrics } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { StatCard } from "@/components/common/StatCard";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Loading } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";

const activityData = [
  { name: "Mon", signups: 120 },
  { name: "Tue", signups: 200 },
  { name: "Wed", signups: 150 },
  { name: "Thu", signups: 280 },
  { name: "Fri", signups: 350 },
  { name: "Sat", signups: 420 },
  { name: "Sun", signups: 380 },
];

const mockUsers = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "seller", status: "active", date: "2026-06-10" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "buyer", status: "active", date: "2026-06-11" },
  { id: 3, name: "Charlie Davis", email: "charlie@example.com", role: "developer", status: "pending", date: "2026-06-12" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "buyer", status: "suspended", date: "2026-06-12" },
  { id: 5, name: "Ethan Hunt", email: "ethan@example.com", role: "seller", status: "active", date: "2026-06-13" },
];

const subText = (text: string) => <p className="text-xs text-muted-foreground mt-2">{text}</p>;

export default function DashboardManager() {
  const { data: managerMetrics } = useManagerMetrics();

  const sidebar = (
    <DashboardSidebar
      heading="Admin Console"
      items={[
        { icon: <Activity className="w-4 h-4" />, label: "Overview", active: true },
        { icon: <Users className="w-4 h-4" />, label: "Users" },
        { icon: <ShieldAlert className="w-4 h-4" />, label: "Moderation" },
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
            <h1 className="text-3xl font-bold text-foreground">Platform Manager</h1>
            <p className="text-muted-foreground mt-1">System overview and moderation tools.</p>
          </header>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Users"
              value={managerMetrics.totalUsers.toLocaleString()}
              sub={subText(`${managerMetrics.newUsersThisMonth} new this month`)}
            />
            <StatCard
              label="Revenue (MTD)"
              value={`£${(managerMetrics.revenueThisMonth / 1000).toFixed(1)}k`}
              sub={subText("Platform fees")}
            />
            <StatCard
              label="Active Listings"
              value={managerMetrics.activeListings.toLocaleString()}
              sub={subText("Products & Services")}
            />
            <StatCard
              label="Open Tickets"
              value={managerMetrics.openTickets}
              valueClassName="text-destructive"
              sub={subText("Support queue")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Chart */}
            <SurfaceCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold mb-6">User Acquisition</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dx={-10} />
                    <RechartsTooltip cursor={{ stroke: "#E2E8F0" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            {/* Moderation Queue */}
            <SurfaceCard className="p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Moderation</h3>
                  <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full font-bold">
                    {managerMetrics.flaggedContent}
                  </span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-border rounded-xl p-3">
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
          </div>

          {/* Users Table */}
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
                      <td className="px-6 py-4">
                        <span className="capitalize">{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            u.status === "active"
                              ? "bg-green-100 text-green-700"
                              : u.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </>
      )}
    </DashboardLayout>
  );
}
