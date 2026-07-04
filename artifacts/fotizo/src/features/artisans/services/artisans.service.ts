import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Service, NewServiceInput } from "@/types";

export const artisansService = {
  async createService(input: NewServiceInput): Promise<Service> {
    if (USE_MOCKS) {
      await delay();
      const id = `s-${Date.now()}`;
      const service: Service = {
        id,
        title: input.title,
        description: input.description,
        provider: input.provider,
        providerId: input.providerId,
        avatar: input.avatar,
        rating: 0,
        reviewCount: 0,
        experience: input.experience,
        hourlyRate: input.hourlyRate,
        category: input.category,
        availability: input.availability,
        packages: input.packages,
        skills: input.skills,
      };
      fx.services.unshift(service);
      return service;
    }
    return api.post<Service>("/services", input);
  },

  async listServices(): Promise<Service[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.services;
    }
    return api.get<Service[]>("/services");
  },

  async getService(id: string): Promise<Service | null> {
    if (USE_MOCKS) {
      await delay();
      return fx.services.find((s) => s.id === id) ?? null;
    }
    return api.get<Service>(`/services/${id}`);
  },
};
