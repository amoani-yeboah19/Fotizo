import { Switch, Route } from "wouter";
import Home from "@/features/home/HomePage";
import Login from "@/features/auth/pages/LoginPage";
import Signup from "@/features/auth/pages/SignupPage";
import ProductsPage from "@/features/marketplace/pages/ProductsPage";
import ProductDetail from "@/features/marketplace/pages/ProductDetailPage";
import ServicesPage from "@/features/artisans/pages/ServicesPage";
import ServiceDetail from "@/features/artisans/pages/ServiceDetailPage";
import CartPage from "@/features/payments/pages/CartPage";
import CheckoutPage from "@/features/payments/pages/CheckoutPage";
import OrderConfirmation from "@/features/payments/pages/OrderConfirmationPage";
import MessagesPage from "@/features/messages/pages/MessagesPage";
import MessageThread from "@/features/messages/pages/MessageThreadPage";
import DashboardBuyer from "@/features/profile/dashboards/BuyerDashboard";
import DashboardSeller from "@/features/profile/dashboards/SellerDashboard";
import DashboardManager from "@/features/profile/dashboards/ManagerDashboard";
import DashboardDeveloper from "@/features/profile/dashboards/DeveloperDashboard";
import NotFound from "@/routes/NotFound";

export function AppRoutes() {
  return (
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
      <Route path="/dashboard/seller" component={DashboardSeller} />
      <Route path="/dashboard/manager" component={DashboardManager} />
      <Route path="/dashboard/developer" component={DashboardDeveloper} />
      <Route component={NotFound} />
    </Switch>
  );
}
