import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { Loading } from "@/components/common/QueryStates";
import NotFound from "@/routes/NotFound";
import { RequireSession } from "@/components/common/RequireSession";
import { DEMO_MODE } from "@/api";

// Route-level code splitting: each page (and its heavy deps like recharts on the
// dashboards) loads only when its route is visited.
const Home = lazy(() => import("@/features/home/pages/HomePage"));
const Settings = lazy(() => import("@/features/settings/pages/SettingsPage"));
const Login = lazy(() => import("@/features/auth/pages/LoginPage"));
const Signup = lazy(() => import("@/features/auth/pages/SignupPage"));
const ProductsPage = lazy(
  () => import("@/features/marketplace/pages/ProductsPage"),
);
const ProductDetail = lazy(
  () => import("@/features/marketplace/pages/ProductDetailPage"),
);
const ShopPage = lazy(() => import("@/features/shop/pages/ShopPage"));
const ShopProductPage = lazy(
  () => import("@/features/shop/pages/ShopProductPage"),
);
const AutosPage = lazy(() => import("@/features/autos/pages/AutosPage"));
const VehicleDetail = lazy(
  () => import("@/features/autos/pages/VehicleDetailPage"),
);
const ServicesPage = lazy(
  () => import("@/features/artisans/pages/ServicesPage"),
);
const ServiceDetail = lazy(
  () => import("@/features/artisans/pages/ServiceDetailPage"),
);
const CartPage = lazy(() => import("@/features/payments/pages/CartPage"));
const CheckoutPage = lazy(
  () => import("@/features/payments/pages/CheckoutPage"),
);
const OrderConfirmation = lazy(
  () => import("@/features/payments/pages/OrderConfirmationPage"),
);
const MessagesPage = lazy(
  () => import("@/features/messaging/pages/MessagesPage"),
);
const MessageThread = lazy(
  () => import("@/features/messaging/pages/MessageThreadPage"),
);
const DashboardLanding = lazy(
  () => import("@/features/profile/pages/DashboardLandingPage"),
);
const DashboardBuyer = lazy(
  () => import("@/features/profile/pages/BuyerDashboard"),
);
const DashboardSeller = lazy(
  () => import("@/features/profile/pages/SellerDashboard"),
);
const DashboardManager = lazy(
  () => import("@/features/profile/pages/ManagerDashboard"),
);
const DashboardDeveloper = lazy(
  () => import("@/features/profile/pages/DeveloperDashboard"),
);
const DashboardRepresentative = lazy(
  () => import("@/features/profile/pages/RepresentativeDashboard"),
);
const DashboardChinaRepresentative = lazy(
  () => import("@/features/profile/pages/ChinaRepresentativeDashboard"),
);
const PostProduct = lazy(
  () => import("@/features/marketplace/pages/PostProductPage"),
);
const OfferService = lazy(
  () => import("@/features/artisans/pages/OfferServicePage"),
);
const SupportPage = lazy(() => import("@/features/support/pages/SupportPage"));
const AboutPage = lazy(() => import("@/features/company/pages/AboutPage"));
const HowItWorksPage = lazy(
  () => import("@/features/company/pages/HowItWorksPage"),
);
const TrustSafetyPage = lazy(
  () => import("@/features/company/pages/TrustSafetyPage"),
);
const TermsPage = lazy(() => import("@/features/company/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/features/company/pages/PrivacyPage"));
const GuidesPage = lazy(() => import("@/features/guides/pages/GuidesPage"));
const GuideArticle = lazy(
  () => import("@/features/guides/pages/GuideArticlePage"),
);
// Demo-build only: role picker that signs a reviewer into any dashboard.
//
// The env check is written inline rather than via the DEMO_MODE re-export because
// Vite substitutes `import.meta.env.VITE_DEMO_MODE` with a literal at build time.
// That makes the whole ternary dead code in a normal build, so Rollup drops the
// dynamic import and never emits the chunk. Going through the imported constant
// leaves the import reachable and ships the page into production untouched.
const DemoLanding =
  import.meta.env.VITE_DEMO_MODE === "true"
    ? lazy(() => import("@/features/demo/pages/DemoLandingPage"))
    : null;

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background">
          <Loading label="Loading…" />
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/settings">
          {() => (
            <RequireSession>
              <Settings />
            </RequireSession>
          )}
        </Route>
        <Route path="/products" component={ProductsPage} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/shop" component={ShopPage} />
        <Route path="/shop/:id" component={ShopProductPage} />
        <Route path="/autos" component={AutosPage} />
        <Route path="/autos/:id" component={VehicleDetail} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/services/:id" component={ServiceDetail} />
        <Route path="/support" component={SupportPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/trust-safety" component={TrustSafetyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/guides" component={GuidesPage} />
        <Route path="/guides/:slug" component={GuideArticle} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout">
          {() => (
            <RequireSession roles={["buyer", "seller"]}>
              <CheckoutPage />
            </RequireSession>
          )}
        </Route>
        <Route path="/order-confirmation">
          {() => (
            <RequireSession>
              <OrderConfirmation />
            </RequireSession>
          )}
        </Route>
        <Route path="/messages">
          {() => (
            <RequireSession>
              <MessagesPage />
            </RequireSession>
          )}
        </Route>
        <Route path="/messages/:id">
          {() => (
            <RequireSession>
              <MessageThread />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard">
          {() => (
            <RequireSession>
              <DashboardLanding />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/buyer">
          {() => (
            <RequireSession roles={["buyer", "seller"]}>
              <DashboardBuyer />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/seller/products/new">
          {() => (
            <RequireSession roles={["seller"]}>
              <PostProduct />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/seller/products/:id/edit">
          {() => (
            <RequireSession roles={["seller"]}>
              <PostProduct />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/china_representative/products/new">
          {() => (
            <RequireSession roles={["china_representative"]}>
              <PostProduct />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/china_representative/products/:id/edit">
          {() => (
            <RequireSession roles={["china_representative"]}>
              <PostProduct />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/seller/services/new">
          {() => (
            <RequireSession roles={["seller"]}>
              <OfferService />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/seller">
          {() => (
            <RequireSession roles={["seller"]}>
              <DashboardSeller />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/manager">
          {() => (
            <RequireSession roles={["manager"]}>
              <DashboardManager />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/developer">
          {() => (
            <RequireSession roles={["developer"]}>
              <DashboardDeveloper />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/representative">
          {() => (
            <RequireSession roles={["representative"]}>
              <DashboardRepresentative />
            </RequireSession>
          )}
        </Route>
        <Route path="/dashboard/china_representative">
          {() => (
            <RequireSession roles={["china_representative"]}>
              <DashboardChinaRepresentative />
            </RequireSession>
          )}
        </Route>
        {DEMO_MODE && DemoLanding && (
          <Route path="/demo" component={DemoLanding} />
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
