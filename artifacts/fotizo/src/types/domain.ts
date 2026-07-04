// Canonical domain types — the shapes the services layer returns and the UI consumes.
// Single source of truth for entities. When the backend contract lands, these should be
// generated from / reconciled with the OpenAPI spec (see @workspace/api-zod).

export type UserRole = "buyer" | "seller" | "manager" | "developer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  verified: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface ProductSpec {
  [key: string]: string;
}

export interface Product {
  id: string;
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
  category: string;
  availability: string;
  packages: ServicePackage[];
  skills: string[];
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

export interface Order {
  id: string;
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

export interface Booking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  provider: string;
  providerAvatar: string;
  package: string;
  price: number;
  status: string;
  date: string;
  time: string;
  meetingLink: string | null;
}

export interface SellerProduct {
  id: string;
  title: string;
  price: number;
  stock: number;
  sales: number;
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

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
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

export interface PlaceOrderInput {
  items: { productId: string; quantity: number; price: number }[];
  total: number;
}

export interface OrderConfirmation {
  orderId: string;
}
