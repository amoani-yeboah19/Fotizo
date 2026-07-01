import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { MessagesProvider } from "@/context/MessagesContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";
import ProductsPage from "@/pages/products";
import ProductDetail from "@/pages/products/[id]";
import ServicesPage from "@/pages/services";
import ServiceDetail from "@/pages/services/[id]";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import OrderConfirmation from "@/pages/order-confirmation";
import MessagesPage from "@/pages/messages";
import MessageThread from "@/pages/messages/[id]";
import DashboardBuyer from "@/pages/dashboard/buyer";
import DashboardSeller from "@/pages/dashboard/seller";
import DashboardManager from "@/pages/dashboard/manager";
import DashboardDeveloper from "@/pages/dashboard/developer";

const queryClient = new QueryClient();

function Router() {
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <CartProvider>
            <MessagesProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </MessagesProvider>
          </CartProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
