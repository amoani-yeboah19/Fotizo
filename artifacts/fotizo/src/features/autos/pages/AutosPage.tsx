import { Link } from "wouter";
import { CatalogueHero } from "@/components/catalogue/CatalogueHero";
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Ship,
  FileCheck2,
  Wrench,
  CarFront,
  ArrowUpRight,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { VehicleCard } from "@/features/autos/components/VehicleCard";
import { Loading, ErrorState } from "@/components/common/QueryStates";
import { Button } from "@/components/ui/button";
import { useVehicles } from "@/features/autos/hooks";
import {
  vehicleName,
  BODY_LABELS,
  FUEL_LABELS,
  vehicleMakes,
  vehicleBodyTypes,
  vehicleFuelTypes,
  type BodyType,
  type FuelType,
} from "@/features/autos/data/vehicles";

const ASSURANCES = [
  {
    icon: Ship,
    title: "Shipped worldwide",
    body: "RoRo freight to your nearest port, tracked the whole way.",
  },
  {
    icon: FileCheck2,
    title: "Duty & papers handled",
    body: "Customs clearance and registration arranged for your country.",
  },
  {
    icon: ShieldCheck,
    title: "Inspected before dispatch",
    body: "Every unit checked at the factory export yard before it sails.",
  },
  {
    icon: Wrench,
    title: "After-sales cover",
    body: "Warranty terms and servicing agreed as part of the quote.",
  },
];

type MakeFilter = string | null;
type BodyFilter = BodyType | null;
type FuelFilter = FuelType | null;

export default function AutosPage() {
  const [make, setMake] = useState<MakeFilter>(null);
  const [body, setBody] = useState<BodyFilter>(null);
  const [fuel, setFuel] = useState<FuelFilter>(null);

  const { data: vehicles = [], isPending, isError, refetch } = useVehicles();
  const makes = useMemo(() => vehicleMakes(vehicles), [vehicles]);
  // Built from the catalogue so the hero can't name a marque we've dropped, or
  // miss one we've added — the exact drift that left "Changan, Jetour and
  // Avatr" sitting there after five more makes arrived.
  const makeList = useMemo(
    () =>
      makes.length > 1
        ? `${makes.slice(0, -1).join(", ")} and ${makes[makes.length - 1]}`
        : (makes[0] ?? "New vehicles"),
    [makes],
  );
  const bodyTypes = useMemo(() => vehicleBodyTypes(vehicles), [vehicles]);
  const fuelTypes = useMemo(() => vehicleFuelTypes(vehicles), [vehicles]);

  const shown = useMemo(
    () =>
      vehicles
        .filter(
          (v) =>
            (!make || v.make === make) &&
            (!body || v.bodyType === body) &&
            (!fuel || v.fuel === fuel),
        )
        .sort((a, b) => a.landedPrice - b.landedPrice),
    [vehicles, make, body, fuel],
  );

  const clearAll = () => {
    setMake(null);
    setBody(null);
    setFuel(null);
  };
  const anyFilter = make !== null || body !== null || fuel !== null;

  return (
    <PageLayout mainClassName="pt-20">
      <div className="catalogue-storefront">
        <div className="container-app">
          <CatalogueHero
            eyebrow="Fotizo Autos"
            title="Your next chapter."
            accent="A new set of wheels."
            description="Find a vehicle that fits the way you move. Explore makes, body styles and powertrains, then tell us your specification and destination for a personalised quote."
            target="#auto-listings"
            action="Find your next drive"
          >
            {vehicles[0] ? (
              <>
                <img
                  className="catalogue-auto-photo"
                  src={vehicles[0].image}
                  alt={vehicleName(vehicles[0])}
                  fetchPriority="high"
                />
                <Link
                  href={`/autos/${vehicles[0].slug}`}
                  className="catalogue-auto-caption"
                >
                  <span>{vehicleName(vehicles[0])}</span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <div className="catalogue-auto-fallback">
                <CarFront size={100} strokeWidth={1} aria-hidden="true" />
                <span>THE ROAD STARTS HERE</span>
              </div>
            )}
          </CatalogueHero>
        </div>
        {/* Assurances */}
        <section className="border-b border-border bg-white">
          <div className="container-app grid grid-cols-1 gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {ASSURANCES.map(({ icon: Icon, title, body: text }) => (
              <div key={title} className="flex gap-3">
                <Icon
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="auto-listings"
          className="container-app catalogue-results py-10"
        >
          <p className="catalogue-eyebrow">Find your fit</p>
          <h2>Explore the collection</h2>
          {!isPending && !isError && vehicles.length > 0 && (
            <p className="mb-6 text-sm text-muted-foreground">
              Explore {makeList}. Filter below to find your next drive.
            </p>
          )}
          {isPending ? (
            <Loading label="Loading vehicles…" />
          ) : isError ? (
            <div className="text-center">
              <ErrorState
                label="We couldn't load the vehicle catalogue."
                className="py-12"
              />
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="font-medium text-foreground">
                No vehicles are listed right now
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We source to order. Contact customer service with the make and
                model you want.
              </p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="catalogue-auto-filters flex flex-col gap-4">
                <FilterRow label="Make">
                  <Chip active={make === null} onClick={() => setMake(null)}>
                    All
                  </Chip>
                  {makes.map((m) => (
                    <Chip
                      key={m}
                      active={make === m}
                      onClick={() => setMake(m)}
                    >
                      {m}
                    </Chip>
                  ))}
                </FilterRow>

                <FilterRow label="Body">
                  <Chip active={body === null} onClick={() => setBody(null)}>
                    All
                  </Chip>
                  {bodyTypes.map((b) => (
                    <Chip
                      key={b}
                      active={body === b}
                      onClick={() => setBody(b)}
                    >
                      {BODY_LABELS[b]}
                    </Chip>
                  ))}
                </FilterRow>

                <FilterRow label="Fuel">
                  <Chip active={fuel === null} onClick={() => setFuel(null)}>
                    All
                  </Chip>
                  {fuelTypes.map((f) => (
                    <Chip
                      key={f}
                      active={fuel === f}
                      onClick={() => setFuel(f)}
                    >
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
                  <p className="font-medium text-foreground">
                    Nothing matches those filters yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We source beyond this list — tell us what you're after and
                    we'll find it.
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
            </>
          )}

          <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
            Prices shown cover the vehicle and sea freight, converted from the
            listing currency. They exclude your country's duty and taxes, which
            vary too much between markets to quote here — the binding figure is
            confirmed per order once we know the destination port and your
            chosen spec. Looking for a model that isn't listed? We source
            globally — just ask.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
