import { api, USE_MOCKS } from "@/api";
import { delay } from "./mocks/delay";
import * as fx from "./mocks/fixtures";
import type { Service } from "@/types";

export const artisansService = {
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
