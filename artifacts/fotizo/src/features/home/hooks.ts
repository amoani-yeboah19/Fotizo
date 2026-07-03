import { useQuery } from "@tanstack/react-query";
import { contentService } from "@/services";

export const useTestimonials = () =>
  useQuery({ queryKey: ["testimonials"], queryFn: contentService.listTestimonials });
