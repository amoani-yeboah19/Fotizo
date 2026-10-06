import type { ShopProduct } from "../data/shop-product";
import { clothingSizeRequest } from "../data/clothing-sizes";

export function ProductOptions({
  product,
  colour,
  size,
  onColour,
  onSize,
}: {
  product: ShopProduct;
  colour: string;
  size: string;
  onColour: (value: string) => void;
  onSize: (value: string) => void;
}) {
  const variants = product.variants ?? [];
  const request = clothingSizeRequest(product);
  if (request) {
    return (
      <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
        <fieldset aria-describedby="size-request-note">
          <legend className="mb-3 text-sm font-semibold">
            {request.label}
            {size ? `: ${size}` : " — choose your size"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {request.sizes.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={size === value}
                onClick={() => onSize(value)}
                className={`min-w-12 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${size === value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <p
          id="size-request-note"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          Standard size requests. Availability and fit for this item must be
          confirmed before ordering.
        </p>
        {size && (
          <p role="status" className="text-sm font-medium">
            Requested size: {size}
          </p>
        )}
        <details className="rounded-lg bg-muted/50 p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            How to choose your size
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {request.guidance}
          </p>
        </details>
      </div>
    );
  }
  if (!variants.length) return null;
  const colours = [...new Set(variants.map((v) => v.colour))];
  const sizes = product.sizeGuide?.map((s) => s.size) ?? [
    ...new Set(variants.map((v) => v.size)),
  ];
  return (
    <div className="mt-6 space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Colour{colour ? `: ${colour}` : " — choose an option"}
        </legend>
        <div className="flex flex-wrap gap-2">
          {colours.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={colour === value}
              onClick={() => onColour(value)}
              className={`flex items-center gap-2 rounded-lg border-2 p-2 text-sm ${colour === value ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <img
                src={variants.find((v) => v.colour === value)!.image}
                alt=""
                className="h-12 w-12 rounded object-cover"
              />
              {value}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Size{size ? `: ${size}` : " — choose an option"}
        </legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={size === value}
              disabled={
                !!colour &&
                !variants.some((v) => v.colour === colour && v.size === value)
              }
              onClick={() => onSize(value)}
              className={`min-w-12 rounded-lg border-2 px-4 py-2 text-sm disabled:opacity-40 ${size === value ? "border-primary bg-primary/5" : "border-border"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
      {colour && size && (
        <p role="status" className="text-sm">
          Selected: {colour} / {size}
        </p>
      )}
      {!!product.sizeGuide?.length && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Size guidance
          </summary>
          <p className="my-3 text-sm text-muted-foreground">
            Supplier-suggested body weight, converted from Chinese jin (1 jin =
            0.5 kg). These are not garment measurements or a guaranteed fit.
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Size</th>
                <th>Suggested body weight</th>
              </tr>
            </thead>
            <tbody>
              {product.sizeGuide.map((row) => (
                <tr key={row.size} className="border-t">
                  <th className="py-2 font-medium">{row.size}</th>
                  <td>{row.suggestedWeightKg} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
