import { useMemo, useState } from "react";
import { ShieldCheck, Ship, FileCheck2, Wrench } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { VehicleCard } from "@/features/autos/components/VehicleCard";
import {
  VEHICLES,
  BODY_LABELS,
  FUEL_LABELS,
  vehicleMakes,
  vehicleBodyTypes,
  vehicleFuelTypes,
  type BodyType,
  type FuelType,
} from "@/features/autos/data/vehicles";

const ASSURANCES = [
  { icon: Ship, title: "Shipped worldwide", body: "RoRo freight to your nearest port, tracked the whole way." },
  { icon: FileCheck2, title: "Duty & papers handled", body: "Customs clearance and registration arranged for your country." },
  { icon: ShieldCheck, title: "Inspected before dispatch", body: "Every unit checked at the factory export yard before it sails." },
  { icon: Wrench, title: "After-sales cover", body: "Warranty terms and servicing agreed as part of the quote." },
];

type MakeFilter = string | null;
type BodyFilter = BodyType | null;
type FuelFilter = FuelType | null;

export default function AutosPage() {
  const [make, setMake] = useState<MakeFilter>(null);
  const [body, setBody] = useState<BodyFilter>(null);
  const [fuel, setFuel] = useState<FuelFilter>(null);

  const makes = useMemo(() => vehicleMakes(), []);
  const bodyTypes = useMemo(() => vehicleBodyTypes(), []);
  const fuelTypes = useMemo(() => vehicleFuelTypes(), []);

  const shown = useMemo(
    () =>
      VEHICLES.filter(
        (v) =>
          (!make || v.make === make) &&
          (!body || v.bodyType === body) &&
          (!fuel || v.fuel === fuel),
      ).sort((a, b) => a.landedPrice - b.landedPrice),
    [make, body, fuel],
  );

  const clearAll = () => {
    setMake(null);
    setBody(null);
    setFuel(null);
  };
  const anyFilter = make !== null || body !== null || fuel !== null;

  return (
    <PageLayout mainClassName="pt-20">
      {/* Hero */}
      <section className="bg-gradient-to-r from-[#08275B] via-[#0a2f6e] to-[#FF6A00]">
        <div className="container-app py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Fotizo Autos</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
            Cars imported to order, anywhere
          </h1>
          <p className="mt-4 max-w-xl text-white/85">
            Toyota, Audi, BYD, Changan, Jetour, Geely and Landwind — sourced new from the
            manufacturer's export channel and shipped to your nearest port. Tell us the spec and the
            destination, and we'll quote the landed price.
          </p>
        </div>
      </section>

      {/* Assurances */}
      <section className="border-b border-border bg-white">
        <div className="container-app grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {ASSURANCES.map(({ icon: Icon, title, body: text }) => (
            <div key={title} className="flex gap-3">
              <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-app py-10">
        {/* Filters */}
        <div className="flex flex-col gap-4 border-b border-border pb-6">
          <FilterRow label="Make">
            <Chip active={make === null} onClick={() => setMake(null)}>All</Chip>
            {makes.map((m) => (
              <Chip key={m} active={make === m} onClick={() => setMake(m)}>
                {m}
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="Body">
            <Chip active={body === null} onClick={() => setBody(null)}>All</Chip>
            {bodyTypes.map((b) => (
              <Chip key={b} active={body === b} onClick={() => setBody(b)}>
                {BODY_LABELS[b]}
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="Fuel">
            <Chip active={fuel === null} onClick={() => setFuel(null)}>All</Chip>
            {fuelTypes.map((f) => (
              <Chip key={f} active={fuel === f} onClick={() => setFuel(f)}>
                {FUEL_LABELS[f]}
              </Chip>
            ))}
          </FilterRow>
        </div>

        <div className="flex items-center justify-between py-5">
          <p className="text-sm text-muted-foreground">
            {shown.length} {shown.length === 1 ? "vehicle" : "vehicles"}
            {anyFilter ? " match your filters" : " available to order"}
          </p>
          {anyFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <p className="font-medium text-foreground">Nothing matches those filters yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We source beyond this list — tell us what you're after and we'll find it.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          Prices shown cover the vehicle and sea freight, converted from the listing currency. They
          exclude your country's duty and taxes, which vary too much between markets to quote here —
          the binding figure is confirmed per order once we know the destination port and your
          chosen spec. Looking for a model that isn't listed? We source globally — just ask.
        </p>
      </section>
    </PageLayout>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
