import { useQuery } from "@tanstack/react-query";
import { contentService } from "@/features/home/services";

export const useTestimonials = () =>
  useQuery({ queryKey: ["testimonials"], queryFn: contentService.listTestimonials });
