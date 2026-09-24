import { useState } from "react";
import { Users, Activity, ShieldAlert, History, LifeBuoy, CarFront, Store, ShoppingBag } from "lucide-react";
import { AUTH_USE_MOCKS } from "@/api";
import { useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { Button } from "@/components/ui/button";
import {
  AccountSummary,
  AccountDirectory,
  AccountAudit,
} from "../components/AccountControls";
import type { ManagedAccount } from "../services/admin.service";
import {
  OperationsOverviewPanel,
  CaseQueue,
  SellerDirectory,
  OrderLedger,
} from "../components/Operations";

type Section = "overview" | "users" | "audit" | "support" | "enquiries" | "sellers" | "orders" | "moderation";
const SECTIONS: Section[] = ["overview", "users", "audit", "support", "enquiries", "sellers", "orders", "moderation"];
const TITLES: Record<Section, string> = {
  overview: "Platform manager",
  users: "Accounts",
  audit: "Account audit",
  support: "Support requests",
  enquiries: "Vehicle enquiries",
  sellers: "Sellers",
  orders: "Orders",
  moderation: "Content moderation",
};
export default function DashboardManager() {
  const [section, setSection] = useDashboardSection<Section>(SECTIONS, "overview");
  const [auditTarget, setAuditTarget] = useState<ManagedAccount | null>(null);
  const sidebar = (
    <DashboardSidebar
      heading="Manager console"
      items={[
        {
          icon: <Activity className="w-4 h-4" />,
          label: "Overview",
          active: section === "overview",
          onClick: () => setSection("overview"),
        },
        {
          icon: <Users className="w-4 h-4" />,
          label: "Users",
          active: section === "users",
          onClick: () => setSection("users"),
        },
        {
          icon: <History className="w-4 h-4" />,
          label: "Account audit",
          active: section === "audit",
          onClick: () => {
            setAuditTarget(null);
            setSection("audit");
          },
        },
        {
          icon: <LifeBuoy className="w-4 h-4" />,
          label: "Support",
          active: section === "support",
          onClick: () => setSection("support"),
        },
        {
          icon: <CarFront className="w-4 h-4" />,
          label: "Vehicle enquiries",
          active: section === "enquiries",
          onClick: () => setSection("enquiries"),
        },
        {
          icon: <Store className="w-4 h-4" />,
          label: "Sellers",
          active: section === "sellers",
          onClick: () => setSection("sellers"),
        },
        {
          icon: <ShoppingBag className="w-4 h-4" />,
          label: "Orders",
          active: section === "orders",
          onClick: () => setSection("orders"),
        },
        {
          icon: <ShieldAlert className="w-4 h-4" />,
          label: "Moderation",
          active: section === "moderation",
          onClick: () => setSection("moderation"),
        },
      ]}
    />
  );
  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8">
        <h1 className="heading-page">{TITLES[section]}</h1>
        <p className="mt-2 text-muted-foreground">
          Figures and queues come from stored platform records.
        </p>
      </header>
      {AUTH_USE_MOCKS ? (
        <p role="status">Account management is unavailable in demo mode.</p>
      ) : (
        <>
          {section === "overview" && (
            <div className="space-y-8">
              <OperationsOverviewPanel />
              <AccountSummary />
              <Button onClick={() => setSection("users")}>
                Manage accounts
              </Button>
            </div>
          )}
          {section === "users" && (
            <AccountDirectory
              onHistory={(account) => {
                setAuditTarget(account);
                setSection("audit");
              }}
            />
          )}
          {section === "audit" && (
            <div className="space-y-5">
              {auditTarget && (
                <div>
                  <p>History for {auditTarget.name}</p>
                  <Button variant="link" onClick={() => setAuditTarget(null)}>
                    Show all account history
                  </Button>
                </div>
              )}
              <AccountAudit
                key={auditTarget?.id ?? "all"}
                targetId={auditTarget?.id}
              />
            </div>
          )}
          {section === "support" && <CaseQueue type="support" />}
          {section === "enquiries" && <CaseQueue type="vehicle_enquiry" />}
          {section === "sellers" && <SellerDirectory />}
          {section === "orders" && <OrderLedger />}
          {section === "moderation" && (
            <p>
              Content moderation is not available yet. Account access can be
              managed in the Users section.
            </p>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
