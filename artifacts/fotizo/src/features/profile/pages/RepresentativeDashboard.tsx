import { Globe, Store, ShoppingBag, ShieldAlert } from "lucide-react";
import { AUTH_USE_MOCKS } from "@/api";
import { useDashboardSection } from "@/features/profile/hooks";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import {
  OperationsOverviewPanel,
  SellerDirectory,
  OrderLedger,
  NotAvailable,
} from "../components/Operations";

type Section = "overview" | "sellers" | "orders" | "approvals";

// Regional representative. Accounts and orders do not yet record a region or
// delivery country, so figures cover the whole platform rather than pretending
// to be regional.
export default function DashboardRepresentative() {
  const [section, setSection] = useDashboardSection<Section>(
    ["overview", "sellers", "orders", "approvals"],
    "overview",
  );

  const sidebar = (
    <DashboardSidebar
      heading="Representative"
      items={[
        { icon: <Globe className="w-4 h-4" />, label: "Overview", active: section === "overview", onClick: () => setSection("overview") },
        { icon: <Store className="w-4 h-4" />, label: "Sellers", active: section === "sellers", onClick: () => setSection("sellers") },
        { icon: <ShoppingBag className="w-4 h-4" />, label: "Orders", active: section === "orders", onClick: () => setSection("orders") },
        { icon: <ShieldAlert className="w-4 h-4" />, label: "Approvals", active: section === "approvals", onClick: () => setSection("approvals") },
      ]}
    />
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <header className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Globe className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="heading-page text-foreground">Representative</h1>
          <p className="text-muted-foreground mt-0.5">
            Platform-wide figures. Customer region is not recorded yet, so regional breakdowns are unavailable.
          </p>
        </div>
      </header>

      {AUTH_USE_MOCKS ? (
        <p role="status">Operational reporting is unavailable in demo mode.</p>
      ) : (
        <>
          {section === "overview" && (
            <div className="space-y-8">
              <OperationsOverviewPanel />
              <SellerDirectory />
            </div>
          )}
          {section === "sellers" && <SellerDirectory />}
          {section === "orders" && <OrderLedger />}
          {section === "approvals" && (
            <NotAvailable title="Approvals are not available yet">
              Seller verification and listing review workflows have not been built. New sellers
              and listings currently go live without an approval step; account suspension is
              handled by managers.
            </NotAvailable>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
