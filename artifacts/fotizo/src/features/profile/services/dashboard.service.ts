import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { ManagerMetrics, DeveloperStats } from "@/types";

export const dashboardService = {
  async getManagerMetrics(): Promise<ManagerMetrics> {
    if (USE_MOCKS) {
      await delay();
      return fx.managerMetrics;
    }
    return api.get<ManagerMetrics>("/admin/metrics");
  },

  async getDeveloperStats(): Promise<DeveloperStats> {
    if (USE_MOCKS) {
      await delay();
      return fx.developerStats;
    }
    return api.get<DeveloperStats>("/developer/stats");
  },
};
