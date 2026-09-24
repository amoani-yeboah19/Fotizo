import { api } from "@/api";
import type { Vehicle } from "@/features/autos/data/vehicles";

// Staff operations: figures and queues computed server-side from stored
// records. See artifacts/api-server/src/routes/operations.ts.

export interface Page<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}

export interface OperationsOverview {
  users: { total: number; buyers: number; sellers: number; newThisMonth: number; suspended: number };
  listings: { marketplace: number; shop: number; unpublished: number; lowStock: number; services: number };
  orders: {
    lines: number;
    value: number;
    linesThisMonth: number;
    valueThisMonth: number;
    /** Six calendar months (UTC), oldest first. */
    monthly: { month: string; value: number; lines: number }[];
  };
  topCategories: { category: string; listings: number }[];
  support: { open: number; inProgress: number };
  vehicleEnquiries: { new: number; active: number };
  vehicles: { active: number; total: number };
}

export interface SellerSummary {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  suspendedAt: string | null;
  activeListings: number;
  orderLines: number;
  orderValue: number;
}

export interface OrderLine {
  id: string;
  orderId: string;
  productTitle: string;
  seller: string;
  buyer: string;
  quantity: number;
  total: number;
  status: string;
  createdAt: string;
  reference: string | null;
  paymentMethod: "pay_on_delivery" | "mobile_money" | "bank_transfer" | null;
  paymentStatus: "unpaid" | "paid";
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  city: string | null;
  country: string | null;
  /** Whole-order total including delivery. */
  orderTotal: number;
}

export type CaseType = "support" | "vehicle_enquiry";

export interface SupportCase {
  id: string;
  reference: string;
  topic: string;
  orderRef: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  statusVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryCase {
  id: string;
  reference: string;
  vehicleId: string;
  vehicleName: string;
  quotedLandedPrice: number;
  name: string;
  email: string;
  phone: string;
  destination: string;
  message: string;
  status: "new" | "contacted" | "quoted" | "closed";
  statusVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseEvent {
  id: string;
  actorName: string;
  fromStatus: string;
  toStatus: string;
  note: string;
  createdAt: string;
}

export interface DeveloperStats {
  startedAt: string;
  uptimeSeconds: number;
  requests: number;
  serverErrors: number;
  errorRate: number;
  avgLatencyMs: number;
  hourly: { hour: string; requests: number; errors: number }[];
  recent: { method: string; route: string; status: number; durationMs: number; at: string }[];
  node: string;
  environment: string;
  database: { ready: boolean; migrations: { name: string; appliedAt: string }[] };
}

const casePath = (type: CaseType) =>
  type === "support" ? "/operations/support-requests" : "/operations/vehicle-enquiries";

export const operationsService = {
  overview: () => api.get<OperationsOverview>("/operations/overview"),
  sellers: (page: number, q: string) =>
    api.get<Page<SellerSummary>>("/operations/sellers", { page, q: q || undefined }),
  orders: (page: number) => api.get<Page<OrderLine>>("/operations/orders", { page }),
  supportCases: (page: number, status: string) =>
    api.get<Page<SupportCase>>(casePath("support"), { page, status }),
  enquiryCases: (page: number, status: string) =>
    api.get<Page<EnquiryCase>>(casePath("vehicle_enquiry"), { page, status }),
  caseEvents: (type: CaseType, id: string) =>
    api.get<CaseEvent[]>(`${casePath(type)}/${id}/events`),
  changeCaseStatus: (
    type: CaseType,
    id: string,
    input: { status: string; expectedVersion: number; note: string },
  ) =>
    api.post<{ id: string; status: string; statusVersion: number }>(
      `${casePath(type)}/${id}/status`,
      input,
    ),
  vehicles: () => api.get<Vehicle[]>("/operations/vehicles"),
  setVehicleStatus: (id: string, status: "active" | "unpublished") =>
    api.post<Vehicle>(`/operations/vehicles/${id}/status`, { status }),
  developerStats: () => api.get<DeveloperStats>("/developer/stats"),
};
