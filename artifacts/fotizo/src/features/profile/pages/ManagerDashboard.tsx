import { useState } from "react";
import { Users, Activity, ShieldAlert, History, LifeBuoy, CarFront } from "lucide-react";
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
import { CaseQueue } from "../components/Operations";

type Section = "overview" | "users" | "audit" | "support" | "enquiries" | "moderation";
export default function DashboardManager() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "users", "audit", "support", "enquiries", "moderation"],
    "overview",
  );
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
        <h1 className="heading-page">
          {section === "users"
            ? "Accounts"
            : section === "audit"
              ? "Account audit"
              : section === "moderation"
                ? "Content moderation"
                : section === "support"
                  ? "Support requests"
                  : section === "enquiries"
                    ? "Vehicle enquiries"
                    : "Platform manager"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Account access and recorded administrative decisions.
        </p>
      </header>
      {AUTH_USE_MOCKS ? (
        <p role="status">Account management is unavailable in demo mode.</p>
      ) : (
        <>
          {section === "overview" && (
            <div className="space-y-6">
              <AccountSummary />
              <Button onClick={() => setSection("users")}>
                Manage accounts
              </Button>
              <p className="text-sm text-muted-foreground">
                Revenue and content-moderation reporting are not available
                yet.
              </p>
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
