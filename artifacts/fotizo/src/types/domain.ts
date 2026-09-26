import type { ServiceGroupId } from "@workspace/service-taxonomy";

// Canonical domain types — the shapes the services layer returns and the UI consumes.
// Single source of truth for entities. When the backend contract lands, these should be
// generated from / reconciled with the OpenAPI spec (see @workspace/api-zod).

// "representative" is the USA regional rep (the selling side). "china_representative"
// is the sourcing side — the Shop supplier network and the Autos import pipeline —
// so the two have almost nothing in common beyond the word. The role id doubles as
// the dashboard path (`/dashboard/${user.role}`), which is why it is not shortened.
export type UserRole =
  | "buyer"
  | "seller"
  | "manager"
  | "developer"
  | "representative"
  | "china_representative";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  verified: boolean;
  hasPassword?: boolean;
  /** True once the account has saved a complete profile. */
  onboardingCompleted?: boolean;
}

/** Account profile as the API stores it (contract v1; choice fields are codes). */
export interface AccountProfileInput {
  country: string;
  city: string;
  language: string;
  accountType: "individual" | "business";
  company: string;
  purpose: string;
  headline: string;
  about: string;
  skills: string[];
  experience: string;
  workMode: string;
  website: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  /** The current Terms and Privacy Policy; the server records the versions. */
  acceptedTerms?: true;
  /** Onboarding profile, saved together with the account. */
  profile?: AccountProfileInput;
}

export interface ProductSpec {
  [key: string]: string;
}

export interface Product {
  id: string;
  channel?: "marketplace" | "shop";
  status?: "active" | "unpublished";
  title: string;
  description: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviewCount: number;
  seller: string;
  sellerId: string;
  category: string;
  image: string;
  images: string[];
  inStock: boolean;
  stockCount: number;
  tags: string[];
  specs: ProductSpec;
}

export interface ServicePackage {
  name: string;
  price: number;
  delivery: string;
  description: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  provider: string;
  providerId: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  experience: string;
  hourlyRate: number;
  /** Category id from @workspace/service-taxonomy, e.g. "plumbing". */
  category: string;
  /** Which side of the platform this lands on. Always derived from `category`
   *  by the server, so it is read-only to the client. */
  group: ServiceGroupId;
  availability: string;
  packages: ServicePackage[];
  skills: string[];
  /** Withdrawn listings are hidden from customers but kept for their owner. */
  status?: "active" | "unpublished";
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
}

export type PaymentMethod = "pay_on_delivery" | "mobile_money" | "bank_transfer" | "paystack" | "stripe";
/** Paid online at checkout: Paystack for Ghana (in cedis), Stripe elsewhere (in GBP). */
export type OnlinePaymentMethod = Extract<PaymentMethod, "paystack" | "stripe">;

export interface Order {
  id: string;
  /** The checkout this line belongs to; one checkout can span several sellers. */
  orderId: string;
  /** Customer-facing order reference, e.g. FTZ-7K2M9Q4P (absent on early orders). */
  reference: string | null;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: PaymentMethod | null;
  productId: string;
  productTitle: string;
  productImage: string;
  seller: string;
  price: number;
  quantity: number;
  status: string;
  date: string;
  trackingNumber: string | null;
}

export type BookingStatus = "requested" | "confirmed" | "declined" | "cancelled" | "completed";

/** A service booking request; the provider confirms or declines it. */
export interface Booking {
  id: string;
  reference: string;
  serviceId: string;
  serviceTitle: string;
  provider: string;
  providerAvatar: string;
  /** The customer who requested it (shown to the provider). */
  buyer: string;
  package: string;
  price: number;
  /** ISO instant; display in the viewer's local time. */
  scheduledFor: string;
  /** The customer's time zone when they booked, e.g. Africa/Accra. */
  timezone: string;
  notes: string;
  status: BookingStatus;
  statusVersion: number;
  providerNote: string;
  meetingLink: string | null;
  createdAt: string;
}

export interface SellerProduct {
  id: string;
  title: string;
  price: number;
  stock: number;
  /** Units sold, excluding cancelled order lines. */
  sales: number;
  rating: number;
  reviewCount: number;
  status: string;
  image: string;
  category: string;
}

// Payload a seller submits from the "Post a product" wizard. Server-generated
// fields (id, rating, reviewCount, inStock) are filled by the service/backend.
export interface NewProductInput {
  title: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number | null;
  stockCount: number;
  images: string[];
  tags: string[];
  specs: ProductSpec;
  seller: string;
  sellerId: string;
}

// Payload a professional submits from the "Offer a service" wizard.
export interface NewServiceInput {
  title: string;
  category: string;
  description: string;
  experience: string;
  hourlyRate: number;
  availability: string;
  skills: string[];
  avatar: string;
  packages: ServicePackage[];
  provider: string;
  providerId: string;
}

export interface ManagerMetrics {
  totalUsers: number;
  newUsersThisMonth: number;
  totalTransactions: number;
  revenueThisMonth: number;
  activeListings: number;
  pendingReviews: number;
  flaggedContent: number;
  openTickets: number;
}

export interface DeveloperStats {
  apiCalls: number;
  webhooksDelivered: number;
  errorRate: number;
  avgLatency: number;
  activeKeys: number;
  rateLimit: number;
}

// A negotiation offer attached to a message — renders as an offer card in the thread.
export interface MessageOffer {
  description: string;
  amount: number;
  status: "pending" | "accepted" | "declined";
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  offer?: MessageOffer;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantRole: string;
  subject: string;
  messages: Message[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export type CurrencyCode = "GBP" | "USD" | "GHS";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
}

export type Currency = CurrencyMeta & { rate: number };

export type CurrencyRates = Record<CurrencyCode, number>;

export interface DeliveryDetails {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: "GH" | "GB" | "US";
}

/** Prices and totals are decided by the server; the cart sends only quantities. */
export interface PlaceOrderInput {
  items: { productId: string; quantity: number }[];
  delivery: DeliveryDetails;
  paymentMethod: PaymentMethod;
  /** One per checkout attempt, so a retried submission cannot create a second order. */
  idempotencyKey: string;
}

export interface OrderConfirmation {
  orderId: string;
  reference: string | null;
  subtotal: number | null;
  shipping: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: "unpaid" | "paid";
  /** Online orders: the provider's payment page, or null if it could not be opened. */
  checkoutUrl?: string | null;
  paymentError?: string;
}

export interface PaymentVerification {
  paymentStatus: "unpaid" | "paid";
  attemptStatus: "pending" | "succeeded" | "failed" | "expired" | null;
  /** False once an unpaid online order was released after the payment window. */
  orderOpen: boolean;
}

export interface OrderDetail extends OrderConfirmation {
  createdAt: string;
  delivery: Omit<DeliveryDetails, "email">;
  items: Order[];
}
