import { api, ApiError, AUTOS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import type { Vehicle } from "@/features/autos/data/vehicles";

export interface VehicleEnquiryInput {
  vehicleId: string;
  name: string;
  email: string;
  phone: string;
  /** Where the car is going — duty and freight can't be quoted without it. */
  destination: string;
  message: string;
}

export interface VehicleEnquiry extends VehicleEnquiryInput {
  id: string;
  /** Quoted back to the customer for follow-up. */
  reference: string;
  vehicleName: string;
  status: string;
  createdAt: string;
}

// The catalogue and enquiries are server-side. Mock mode (demo builds) has no
// vehicle catalogue and cannot capture leads.
export const autosService = {
  async listVehicles(): Promise<Vehicle[]> {
    if (AUTOS_USE_MOCKS) {
      await delay();
      return [];
    }
    return api.get<Vehicle[]>("/vehicles");
  },

  async getVehicle(slug: string): Promise<Vehicle | null> {
    if (AUTOS_USE_MOCKS) return null;
    try {
      return await api.get<Vehicle>(`/vehicles/${encodeURIComponent(slug)}`);
    } catch (error) {
      // An unpublished or unknown vehicle is a normal "not found" outcome.
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
};

export async function submitVehicleEnquiry(input: VehicleEnquiryInput): Promise<VehicleEnquiry> {
  if (AUTOS_USE_MOCKS) throw new Error("Vehicle enquiries are unavailable in demo mode.");
  return api.post<VehicleEnquiry>("/vehicle-enquiries", input);
}
