import { useState } from "react";
import { Link, useParams } from "wouter";
import { Check, Clock, Users, Gauge, Cog, Car } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { VehicleCard } from "@/features/autos/components/VehicleCard";
import { VehicleEnquiryDialog } from "@/features/autos/components/VehicleEnquiryDialog";
import {
  getVehicle,
  relatedVehicles,
  leadTimeLabel,
  vehicleName,
  BODY_LABELS,
  FUEL_LABELS,
} from "@/features/autos/data/vehicles";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = getVehicle(id ?? "");
  const [activeImage, setActiveImage] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  if (!vehicle) {
    return (
      <PageLayout mainClassName="container-app py-32 text-center">
        <h1 className="heading-page text-foreground">Vehicle not found</h1>
        <p className="mt-2 text-muted-foreground">
          That listing may have been removed or the link is wrong.
        </p>
        <Link href="/autos">
          <Button className="mt-6">Back to Fotizo Autos</Button>
        </Link>
      </PageLayout>
    );
  }

  const specs = [
    { icon: Car, label: "Body", value: BODY_LABELS[vehicle.bodyType] },
    { icon: Cog, label: "Powertrain", value: vehicle.powertrain },
    { icon: Gauge, label: FUEL_LABELS[vehicle.fuel] === "Electric" ? "Range" : "Economy", value: vehicle.efficiency },
    { icon: Users, label: "Seats", value: `${vehicle.seats}` },
    { icon: Cog, label: "Transmission", value: vehicle.transmission },
    { icon: Car, label: "Drivetrain", value: vehicle.drivetrain },
  ];

  const related = relatedVehicles(vehicle);

  return (
    <PageLayout mainClassName="container-app pt-28 pb-20">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/autos">
          <span className="cursor-pointer hover:text-primary">Fotizo Autos</span>
        </Link>
        <span>/</span>
        <span className="text-foreground">{vehicleName(vehicle)}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-16/10 overflow-hidden rounded-2xl bg-muted">
            <img
              loading="eager"
              decoding="async"
              src={vehicle.images[activeImage]}
              alt={`${vehicleName(vehicle)} — view ${activeImage + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
          {vehicle.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {vehicle.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === activeImage}
                  className={`h-16 w-24 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === activeImage ? "border-primary" : "border-transparent hover:border-border"
                  }`}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary + enquiry */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{vehicle.make}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-foreground sm:text-4xl">
            {vehicleName(vehicle)}
          </h1>

          <ul className="mt-4 flex flex-wrap gap-2">
            {vehicle.highlights.map((h) => (
              <li
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
              >
                <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl border border-border p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Estimate, incl. sea freight
            </p>
            <Price amount={vehicle.landedPrice} className="mt-1 block text-3xl font-extrabold text-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">
              Excludes your country's duty and taxes. Binding quote confirmed on enquiry.
            </p>

            <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Typical lead time {leadTimeLabel(vehicle)} from order to handover
            </p>

            <Button className="mt-5 w-full" size="lg" onClick={() => setEnquiryOpen(true)}>
              Enquire about this vehicle
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              No payment taken online — a specialist confirms the quote first.
            </p>
          </div>

          <p className="mt-6 leading-relaxed text-muted-foreground">{vehicle.description}</p>
        </div>
      </div>

      {/* Specs */}
      <section className="mt-14">
        <h2 className="text-xl font-bold text-foreground">Specification</h2>
        <dl className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {specs.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white p-4">
              <dt className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-foreground">You might also consider</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      )}

      <VehicleEnquiryDialog vehicle={vehicle} open={enquiryOpen} onOpenChange={setEnquiryOpen} />
    </PageLayout>
  );
}
