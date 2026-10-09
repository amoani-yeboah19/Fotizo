import { useState } from "react";
import { Check, Clock, RotateCcw } from "lucide-react";
import { Price } from "@/components/common/Price";
import type { ServiceDetails, ServicePackage } from "@/types";

export function PackageChoices({
  packages,
  action,
  priceCurrency,
}: {
  packages: ServicePackage[];
  priceCurrency?: "USD";
  action?: (pkg: ServicePackage) => React.ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const pkg = packages[Math.min(selected, packages.length - 1)];
  if (!pkg) return null;
  return (
    <section className="rounded-2xl border overflow-hidden bg-white">
      <div className="flex border-b" aria-label="Choose a package">
        {packages.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={selected === i}
            className={`flex-1 min-w-0 px-2 py-4 text-sm font-semibold ${selected === i ? "bg-primary text-white" : "hover:bg-muted"}`}
            onClick={() => setSelected(i)}
          >
            {["Basic", "Standard", "Premium"][i] ?? p.name}
          </button>
        ))}
      </div>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-bold text-lg break-words">{pkg.name}</h3>
          {priceCurrency === "USD" ? (
            <span className="font-bold text-xl">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(pkg.price)}
            </span>
          ) : (
            <Price amount={pkg.price} className="font-bold text-xl" />
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {pkg.description}
        </p>
        <p className="flex gap-2 items-center text-sm">
          <Clock size={16} />
          {pkg.delivery}
        </p>
        {pkg.revisions !== undefined && (
          <p className="flex gap-2 items-center text-sm">
            <RotateCcw size={16} />
            {pkg.revisions} revision{pkg.revisions === 1 ? "" : "s"} included
          </p>
        )}
        {!!pkg.features?.length && (
          <ul className="space-y-2">
            {pkg.features.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Check size={16} className="shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        )}
        {action ? (
          action(pkg)
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-center">
            Buyers can select this package after publication.
          </p>
        )}
      </div>
    </section>
  );
}
export function ServiceDetailsContent({
  details,
}: {
  details?: ServiceDetails;
}) {
  return (
    <>
      {!!details?.requirements.length && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Before we get started</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            {details.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      {!!details?.faqs.length && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Frequently asked questions</h2>
          {details.faqs.map((f, i) => (
            <details key={i} className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">
                {f.question}
              </summary>
              <p className="pt-3 whitespace-pre-wrap text-muted-foreground">
                {f.answer}
              </p>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
export function ServiceGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  return (
    <div className="space-y-3">
      <img
        src={images[Math.min(active, images.length - 1)]}
        alt="Service work sample"
        className="w-full max-h-96 rounded-xl object-contain bg-muted"
      />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`View work sample ${i + 1}`}
            aria-pressed={active === i}
            className={`shrink-0 rounded-lg border-2 p-1 ${active === i ? "border-primary" : "border-transparent"}`}
          >
            <img src={src} alt="" className="h-16 w-20 rounded object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
export function ServiceOfferPreview({
  title,
  description,
  provider,
  avatar,
  category,
  packages,
  details,
  priceCurrency,
}: {
  title: string;
  description: string;
  provider: string;
  avatar: string;
  category: string;
  packages: ServicePackage[];
  priceCurrency?: "USD";
  details: ServiceDetails;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <p className="text-sm text-muted-foreground">{category}</p>
        <h2 className="text-2xl font-bold break-words">{title}</h2>
        <div className="flex items-center gap-3">
          {avatar && (
            <img
              src={avatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          )}
          <span className="font-semibold">{provider}</span>
        </div>
        <ServiceGallery images={details.gallery} />
        <section>
          <h3 className="text-xl font-bold mb-3">About this service</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {description}
          </p>
        </section>
        <ServiceDetailsContent details={details} />
      </div>
      <div>
        <PackageChoices packages={packages} priceCurrency={priceCurrency} />
      </div>
    </div>
  );
}
