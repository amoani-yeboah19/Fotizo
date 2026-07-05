import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { Loading } from "@/components/common/QueryStates";
import NotFound from "@/routes/NotFound";

// Route-level code splitting: each page (and its heavy deps like recharts on the
// dashboards) loads only when its route is visited.
const Home = lazy(() => import("@/features/home/pages/HomePage"));
const Login = lazy(() => import("@/features/auth/pages/LoginPage"));
const Signup = lazy(() => import("@/features/auth/pages/SignupPage"));
const ProductsPage = lazy(() => import("@/features/marketplace/pages/ProductsPage"));
const ProductDetail = lazy(() => import("@/features/marketplace/pages/ProductDetailPage"));
const ServicesPage = lazy(() => import("@/features/artisans/pages/ServicesPage"));
const ServiceDetail = lazy(() => import("@/features/artisans/pages/ServiceDetailPage"));
const CartPage = lazy(() => import("@/features/payments/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/features/payments/pages/CheckoutPage"));
const OrderConfirmation = lazy(() => import("@/features/payments/pages/OrderConfirmationPage"));
const MessagesPage = lazy(() => import("@/features/messaging/pages/MessagesPage"));
const MessageThread = lazy(() => import("@/features/messaging/pages/MessageThreadPage"));
const DashboardBuyer = lazy(() => import("@/features/profile/pages/BuyerDashboard"));
const DashboardSeller = lazy(() => import("@/features/profile/pages/SellerDashboard"));
const DashboardManager = lazy(() => import("@/features/profile/pages/ManagerDashboard"));
const DashboardDeveloper = lazy(() => import("@/features/profile/pages/DeveloperDashboard"));
const DashboardRepresentative = lazy(() => import("@/features/profile/pages/RepresentativeDashboard"));
const PostProduct = lazy(() => import("@/features/marketplace/pages/PostProductPage"));
const OfferService = lazy(() => import("@/features/artisans/pages/OfferServicePage"));

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
        <Route path="/products" component={ProductsPage} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/services/:id" component={ServiceDetail} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/messages/:id" component={MessageThread} />
        <Route path="/dashboard/buyer" component={DashboardBuyer} />
        <Route path="/dashboard/seller/products/new" component={PostProduct} />
        <Route path="/dashboard/seller/services/new" component={OfferService} />
        <Route path="/dashboard/seller" component={DashboardSeller} />
        <Route path="/dashboard/manager" component={DashboardManager} />
        <Route path="/dashboard/developer" component={DashboardDeveloper} />
        <Route path="/dashboard/representative" component={DashboardRepresentative} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
