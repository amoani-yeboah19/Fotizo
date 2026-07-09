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
