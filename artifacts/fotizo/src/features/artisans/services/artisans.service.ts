import { groupForCategory, matchServiceCategory } from "@workspace/service-taxonomy";
import { api, ARTISANS_USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Service, NewServiceInput } from "@/types";

// A backend that predates the services.group column returns rows without it,
// and legacy rows still carry a free-text category ("Development"). Recover
// both here so the listing groups correctly whichever side deploys first —
// once the server backfill has run this is a no-op.
function normalise(service: Service): Service {
  if (service.group && service.category) return service;
  const match = matchServiceCategory(service.category ?? "");
  if (!match) return service;
  return { ...service, category: match.id, group: service.group ?? match.group };
}

export const artisansService = {
  async createService(input: NewServiceInput): Promise<Service> {
    if (ARTISANS_USE_MOCKS) {
      await delay();
      // Mirrors what POST /services does server-side: the group is derived from
      // the chosen category, never sent by the client, so a plumber's listing
      // lands under Artisans & Trades on its own.
      const group = groupForCategory(input.category);
      if (!group) throw new Error(`Unknown service category: ${input.category}`);
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
        group,
        availability: input.availability,
        packages: input.packages,
        skills: input.skills,
      };
      fx.services.unshift(service);
      return service;
    }
    return normalise(await api.post<Service>("/services", input));
  },

  async listServices(filter?: { group?: string; category?: string }): Promise<Service[]> {
    if (ARTISANS_USE_MOCKS) {
      await delay();
      return fx.services.filter(
        (s) =>
          (!filter?.group || s.group === filter.group) &&
          (!filter?.category || s.category === filter.category),
      );
    }
    const query = new URLSearchParams();
    if (filter?.group) query.set("group", filter.group);
    if (filter?.category) query.set("category", filter.category);
    const qs = query.toString();
    const list = await api.get<Service[]>(`/services${qs ? `?${qs}` : ""}`);
    const normalised = list.map(normalise);
    // An older backend ignores the query params, so re-apply the filter here.
    return normalised.filter(
      (s) =>
        (!filter?.group || s.group === filter.group) &&
        (!filter?.category || s.category === filter.category),
    );
  },

  async getService(id: string): Promise<Service | null> {
    if (ARTISANS_USE_MOCKS) {
      await delay();
      return fx.services.find((s) => s.id === id) ?? null;
    }
    return normalise(await api.get<Service>(`/services/${id}`));
  },
};
