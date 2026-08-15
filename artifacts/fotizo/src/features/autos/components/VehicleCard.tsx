import { memo } from "react";
import { Link } from "wouter";
import { Users, Gauge, Clock } from "lucide-react";
import { Price } from "@/components/common/Price";
import {
  BODY_LABELS,
  FUEL_ICONS,
  FUEL_LABELS,
  leadTimeLabel,
  vehicleName,
  type Vehicle,
} from "@/features/autos/data/vehicles";

// Note the absence of a quick-add button. Unlike ShopProductCard there is no
// cart path here — the only action on a vehicle is to enquire, which happens on
// the detail page where the buyer can see the full spec first.
export const VehicleCard = memo(function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const FuelIcon = FUEL_ICONS[vehicle.fuel];

  return (
    <Link href={`/autos/${vehicle.id}`}>
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg cursor-pointer">
        <div className="relative aspect-16/10 overflow-hidden bg-muted">
          <img
            loading="lazy"
            decoding="async"
            src={vehicle.image}
            alt={vehicleName(vehicle)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
            {vehicle.make}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
            <FuelIcon className="h-3 w-3" aria-hidden="true" />
            {FUEL_LABELS[vehicle.fuel]}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-base font-bold leading-snug text-foreground group-hover:text-primary">
            {vehicleName(vehicle)}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {BODY_LABELS[vehicle.bodyType]} · {vehicle.powertrain}
          </p>

          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">Seats</dt>
              <dd>{vehicle.seats} seats</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">Efficiency</dt>
              <dd>{vehicle.efficiency}</dd>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <dt className="sr-only">Lead time</dt>
              <dd>{leadTimeLabel(vehicle)}</dd>
            </div>
          </dl>

          <div className="mt-auto pt-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Est. incl. freight
            </p>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <Price amount={vehicle.landedPrice} className="text-xl font-extrabold text-foreground" />
              <span className="text-xs font-semibold text-primary group-hover:underline">
                Enquire →
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
});
