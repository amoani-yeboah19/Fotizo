import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { DeveloperStats } from "@/types";

export const dashboardService = {
  async getDeveloperStats(): Promise<DeveloperStats> {
    if (USE_MOCKS) {
      await delay();
      return fx.developerStats;
    }
    return api.get<DeveloperStats>("/developer/stats");
  },
};
