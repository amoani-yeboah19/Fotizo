import { memo } from "react";
import { CheckCircle2, Clock, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { RatingStars } from "@/components/common/RatingStars";

interface Service {
  id: string;
  title: string;
  provider: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  experience: string;
  hourlyRate: number;
  category: string;
  availability: string;
}

export const ServiceCard = memo(function ServiceCard({ service }: { service: Service }) {
  const isAvailableNow = service.availability.toLowerCase().includes("now");

  return (
    <Link href={`/services/${service.id}`}>
      <div className="flex flex-col bg-white rounded-2xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
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
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{service.category} Expert</p>
            </div>
          </div>
          <RatingStars
            value={service.rating}
            reviewCount={service.reviewCount}
            className="bg-muted/50 px-2 py-1 rounded-md text-sm font-medium"
          />
        </div>
        
        <h3 className="text-lg font-bold text-foreground leading-snug mb-4 line-clamp-2">
          {service.title}
        </h3>
        
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-6">
          <div className="flex items-center text-muted-foreground">
            <Briefcase className="w-4 h-4 mr-2" />
            {service.experience} exp.
          </div>
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            {service.availability}
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div>
            <Price amount={service.hourlyRate} className="text-lg font-bold text-foreground" />
            <span className="text-sm text-muted-foreground">/hr</span>
          </div>
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5 rounded-full px-6">
            View Details
          </Button>
        </div>
      </div>
    </Link>
  );
});
