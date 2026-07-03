import { api, USE_MOCKS } from "@/api";
import { delay } from "@/services/mocks/delay";
import * as fx from "@/services/mocks/fixtures";
import type { Testimonial } from "@/types";

export const contentService = {
  async listTestimonials(): Promise<Testimonial[]> {
    if (USE_MOCKS) {
      await delay();
      return fx.testimonials;
    }
    return api.get<Testimonial[]>("/testimonials");
  },
};
