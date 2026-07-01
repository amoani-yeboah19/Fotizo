import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { developerStats } from "@/data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Code, Terminal, Key, Book, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const apiData = Array.from({length: 24}).map((_, i) => ({
  time: `${i}:00`,
  calls: Math.floor(Math.random() * 5000) + 1000
}));

export default function DashboardDeveloper() {
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Developer Hub</h3>
            <nav className="space-y-1">
              <span className="flex items-center gap-3 px-3 py-2.5 bg-primary/5 text-primary font-medium rounded-lg cursor-pointer">
                <Terminal className="w-4 h-4" /> Console
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer">
                <Key className="w-4 h-4" /> API Keys
              </span>
              <span className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted rounded-lg cursor-pointer">
                <Code className="w-4 h-4" /> Webhooks
              </span>
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
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
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground mb-1">API Calls (30d)</p>
                <h4 className="text-2xl font-bold font-mono">{developerStats.apiCalls.toLocaleString()}</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground mb-1">Error Rate</p>
                <h4 className="text-2xl font-bold font-mono text-green-600">{developerStats.errorRate}%</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Latency</p>
                <h4 className="text-2xl font-bold font-mono">{developerStats.avgLatency}ms</h4>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm bg-primary text-white border-primary">
                <p className="text-sm font-medium text-primary-foreground/80 mb-1">Current Plan</p>
                <h4 className="text-2xl font-bold">Pro</h4>
                <p className="text-xs text-primary-foreground/60 mt-1">{developerStats.rateLimit} req/min limit</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-8">
              <h3 className="text-lg font-bold mb-6">API Requests (24h)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={apiData}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                    <Tooltip cursor={{stroke: '#cbd5e1'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* API Keys */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-bold">API Keys</h3>
                  <Button size="sm">Generate New Key</Button>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    {name: "Production App", key: "pk_live_*******************8a9b", date: "May 10"},
                    {name: "Staging Env", key: "pk_test_*******************2x4z", date: "Jun 02"}
                  ].map((k,i) => (
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
              </div>

              {/* Webhooks */}
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-lg font-bold">Webhooks</h3>
                  <Button size="sm" variant="outline">Add Endpoint</Button>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    {url: "https://api.myapp.com/webhooks/fotizo", events: "order.created, order.updated", status: "healthy"},
                    {url: "https://api.myapp.com/webhooks/payouts", events: "payout.paid", status: "healthy"}
                  ].map((w,i) => (
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
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
