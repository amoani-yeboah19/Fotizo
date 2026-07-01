import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { managerMetrics } from "@/data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Users, Activity, ShieldAlert, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const activityData = [
  { name: 'Mon', signups: 120 },
  { name: 'Tue', signups: 200 },
  { name: 'Wed', signups: 150 },
  { name: 'Thu', signups: 280 },
  { name: 'Fri', signups: 350 },
  { name: 'Sat', signups: 420 },
  { name: 'Sun', signups: 380 },
];

const mockUsers = [
  { id: 1, name: "Alice Chen", email: "alice@example.com", role: "seller", status: "active", date: "2026-06-10" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "buyer", status: "active", date: "2026-06-11" },
  { id: 3, name: "Charlie Davis", email: "charlie@example.com", role: "developer", status: "pending", date: "2026-06-12" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "buyer", status: "suspended", date: "2026-06-12" },
  { id: 5, name: "Ethan Hunt", email: "ethan@example.com", role: "seller", status: "active", date: "2026-06-13" },
];

export default function DashboardManager() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 flex pt-20">
        <aside className="w-64 border-r border-border bg-white hidden md:block">
          <div className="p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Admin Console</h3>
            <nav className="space-y-1">
              <span className="flex items-center gap-3 px-3 py-2.5 bg-primary/5 text-primary font-medium rounded-lg cursor-pointer">
                <Activity className="w-4 h-4" /> Overview
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer">
                <Users className="w-4 h-4" /> Users
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer">
                <ShieldAlert className="w-4 h-4" /> Moderation
              </span>
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Platform Manager</h1>
              <p className="text-muted-foreground mt-1">System overview and moderation tools.</p>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard title="Total Users" value={managerMetrics.totalUsers.toLocaleString()} sub={`${managerMetrics.newUsersThisMonth} new this month`} />
              <MetricCard title="Revenue (MTD)" value={`£${(managerMetrics.revenueThisMonth/1000).toFixed(1)}k`} sub="Platform fees" />
              <MetricCard title="Active Listings" value={managerMetrics.activeListings.toLocaleString()} sub="Products & Services" />
              <MetricCard title="Open Tickets" value={managerMetrics.openTickets} sub="Support queue" alert />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-6">
                <h3 className="text-lg font-bold mb-6">User Acquisition</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                      <RechartsTooltip cursor={{stroke: '#E2E8F0'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="signups" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r:4, fill: "white", strokeWidth: 2}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Moderation Queue */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Moderation</h3>
                    <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full font-bold">{managerMetrics.flaggedContent}</span>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {[1,2,3].map(i => (
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
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
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
                    {mockUsers.map(u => (
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
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'active' ? 'bg-green-100 text-green-700' : 
                            u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
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
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, alert = false }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
      <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
      <h4 className={`text-3xl font-bold ${alert ? 'text-destructive' : ''}`}>{value}</h4>
      <p className="text-xs text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}
