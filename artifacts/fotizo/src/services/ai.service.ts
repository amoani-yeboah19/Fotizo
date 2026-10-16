import { api } from "@/api";

// AI listing writer. Always hits the real backend (POST /ai/listing) — there's no
// mock branch because generation is inherently a server-side call (the Anthropic
// key never touches the client bundle). Auth is via the session cookie the api
// client already sends.

export interface ProductListingDraft {
  description: string;
  tags: string[];
  specs: { name: string; value: string }[];
}

export interface ServiceListingDraft {
  description: string;
  skills: string[];
}

interface ListingRequest {
  title: string;
  category: string;
  notes?: string;
}

export const aiService = {
  writeProductListing(input: ListingRequest): Promise<ProductListingDraft> {
    return api.post<ProductListingDraft>("/ai/listing", { kind: "product", ...input });
  },
  writeServiceListing(input: ListingRequest): Promise<ServiceListingDraft> {
    return api.post<ServiceListingDraft>("/ai/listing", { kind: "service", ...input });
  },
};

export interface PhotoListingDraft {
  title: string;
  description: string;
  tags: string[];
  skills: string[];
  specs: { name: string; value: string }[];
  vehicle: {
    make: string; model: string; bodyType: "" | "suv" | "coupe-suv" | "sedan" | "pickup";
    fuel: "" | "petrol" | "hybrid" | "electric";
    transmission: string; drivetrain: string; powertrain: string; efficiency: string;
  };
}
export function suggestFromPhotos(kind: "product" | "service" | "vehicle", images: string[]): Promise<PhotoListingDraft> {
  return api.post<PhotoListingDraft>("/ai/photos", { kind, images: images.slice(0, 3) });
}
