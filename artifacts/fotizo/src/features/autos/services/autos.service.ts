import { api, AUTOS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";

export interface VehicleEnquiryInput {
  vehicleId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface VehicleEnquiry extends VehicleEnquiryInput {
  id: string;
  createdAt: string;
}

// Captured enquiries, mock mode only. A real backend needs POST /vehicle-enquiries
// writing to a leads table, plus a notification to the sales team — a lead that
// only lives in browser memory is lost the moment the tab closes.
export const mockEnquiries: VehicleEnquiry[] = [];

export async function submitVehicleEnquiry(input: VehicleEnquiryInput): Promise<VehicleEnquiry> {
  if (AUTOS_USE_MOCKS) {
    await delay();
    const enquiry: VehicleEnquiry = {
      ...input,
      id: `enq-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    mockEnquiries.unshift(enquiry);
    return enquiry;
  }
  return api.post<VehicleEnquiry>("/vehicle-enquiries", input);
}
