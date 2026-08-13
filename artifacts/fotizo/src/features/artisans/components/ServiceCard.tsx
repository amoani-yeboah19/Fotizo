import { memo } from "react";
import { CheckCircle2, Clock, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { RatingStars } from "@/components/common/RatingStars";
import { NegotiateDialog } from "@/features/artisans/components/NegotiateDialog";
import {
  serviceCategoryLabel,
  serviceGroupLabel,
  type ServiceGroupId,
} from "@workspace/service-taxonomy";

interface Service {
  id: string;
  title: string;
  provider: string;
  providerId: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  experience: string;
  hourlyRate: number;
  category: string;
  group: ServiceGroupId;
  availability: string;
}

export const ServiceCard = memo(function ServiceCard({ service }: { service: Service }) {
  const isAvailableNow = service.availability.toLowerCase().includes("now");

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 h-full">
      <Link href={`/services/${service.id}`} className="block cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img loading="lazy" decoding="async"
                src={service.avatar}
                alt={service.provider}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${isAvailableNow ? 'bg-green-500' : 'bg-yellow-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-foreground">{service.provider}</h4>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {serviceCategoryLabel(service.category)}
              </p>
            </div>
          </div>
          <RatingStars
            value={service.rating}
            reviewCount={service.reviewCount}
            className="shrink-0 bg-muted/50 px-2 py-1 rounded-md text-sm font-medium"
          />
        </div>

        <h3 className="text-lg font-bold text-foreground leading-snug mb-4 line-clamp-2">
          {service.title}
        </h3>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
          <div className="flex items-center text-muted-foreground">
            <Briefcase className="w-4 h-4 mr-2 shrink-0" />
            {service.experience} exp.
          </div>
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 shrink-0" />
            {service.availability}
          </div>
        </div>

        {/* Which side of the platform this provider sits on. */}
        <span className="mb-6 inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {serviceGroupLabel(service.group)}
        </span>
      </Link>

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-2">
        <div className="shrink-0">
          <Price amount={service.hourlyRate} className="text-lg font-bold text-foreground" />
          <span className="text-sm text-muted-foreground">/hr</span>
        </div>
        <div className="flex items-center gap-2">
          <NegotiateDialog
            service={{
              id: service.id,
              title: service.title,
              provider: service.provider,
              providerId: service.providerId,
              avatar: service.avatar,
              hourlyRate: service.hourlyRate,
            }}
          />
          <Link href={`/services/${service.id}`}>
            <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 rounded-full px-5">
              View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
});
