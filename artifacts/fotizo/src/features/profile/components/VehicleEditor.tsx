import { PhotoListingAssist } from "@/components/common/PhotoListingAssist";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ImageUploadInput } from "@/components/common/FormControls";
import { apiErrorMessage } from "@/api";
import type { Vehicle } from "@/features/autos/data/vehicles";
import { BODY_LABELS, FUEL_LABELS } from "@/features/autos/data/vehicles";
import { operationsService } from "../services/operations.service";

type Draft = Omit<Vehicle, "id" | "slug" | "image" | "status">;
const empty: Draft = {
  make: "",
  model: "",
  bodyType: "suv",
  fuel: "petrol",
  seats: 5,
  transmission: "",
  drivetrain: "",
  powertrain: "",
  efficiency: "",
  landedPrice: 0,
  leadTimeWeeks: [4, 8],
  images: [],
  highlights: [],
  description: "",
};

export function VehicleEditor({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    vehicle
      ? {
          make: vehicle.make,
          model: vehicle.model,
          bodyType: vehicle.bodyType,
          fuel: vehicle.fuel,
          seats: vehicle.seats,
          transmission: vehicle.transmission,
          drivetrain: vehicle.drivetrain,
          powertrain: vehicle.powertrain,
          efficiency: vehicle.efficiency,
          landedPrice: vehicle.landedPrice,
          leadTimeWeeks: vehicle.leadTimeWeeks,
          images: vehicle.images,
          highlights: vehicle.highlights,
          description: vehicle.description,
        }
      : empty,
  );
  const [highlights, setHighlights] = useState(draft.highlights.join("\n"));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const cache = useQueryClient();
  const highlightLines = highlights
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const save = useMutation({
    mutationFn: () =>
      operationsService.saveVehicle({ ...draft, highlights: highlightLines }, vehicle?.id),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["operations"] });
      cache.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (err) =>
      setError(
        apiErrorMessage(err, "The vehicle could not be saved. Please retry."),
      ),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (uploading || save.isPending) return;
    if (!draft.images.length) {
      setError("Upload at least one vehicle photo.");
      return;
    }
    // Cleared number boxes would otherwise be sent as nothing and refused.
    if (!Number.isInteger(draft.seats) || draft.seats < 1 || draft.seats > 60) {
      setError("Enter the number of seats (1 to 60).");
      return;
    }
    if (!Number.isFinite(draft.landedPrice) || draft.landedPrice <= 0) {
      setError("Enter an estimated landed price above zero.");
      return;
    }
    if (!draft.leadTimeWeeks.every((w) => Number.isInteger(w) && w >= 1 && w <= 520)) {
      setError("Enter lead times of 1 to 520 weeks.");
      return;
    }
    if (draft.leadTimeWeeks[1] < draft.leadTimeWeeks[0]) {
      setError("Maximum lead time must be at least the minimum.");
      return;
    }
    if (highlightLines.length > 12 || highlightLines.some((line) => line.length > 200)) {
      setError("Keep highlights to 12 lines of up to 200 characters each.");
      return;
    }
    setError("");
    save.mutate();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending && !uploading) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
        <DialogDescription>
          {vehicle
            ? "Update the photos and specifications. Publication status stays the same."
            : "Save a car as unpublished, review it, then publish it from the vehicle catalogue."}
        </DialogDescription>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={save.isPending} className="space-y-5">
            <Field
              label="Vehicle photos"
              required
              hint="Upload up to 12 photos. The first photo is the cover."
            >
              <ImageUploadInput
                value={draft.images}
                onChange={(images) => setDraft((d) => ({ ...d, images }))}
                purpose="product"
                maxFiles={12}
                onBusyChange={setUploading}
              />
            </Field>
            <PhotoListingAssist images={draft.images} kind="vehicle" disabled={uploading || save.isPending} onDraft={suggestion => {
              setDraft(current => {
                const next = { ...current };
                for (const key of ["make", "model", "transmission", "drivetrain", "powertrain", "efficiency"] as const) {
                  if (!current[key].trim() && suggestion.vehicle[key]) next[key] = suggestion.vehicle[key];
                }
                // A new vehicle's body type and fuel start at the defaults, so
                // take what the photos show unless they were already changed.
                if (!vehicle && current.bodyType === empty.bodyType && suggestion.vehicle.bodyType)
                  next.bodyType = suggestion.vehicle.bodyType;
                if (!vehicle && current.fuel === empty.fuel && suggestion.vehicle.fuel)
                  next.fuel = suggestion.vehicle.fuel;
                if (!current.description.trim()) next.description = suggestion.description;
                return next;
              });
              setHighlights(current => current.trim() ? current : suggestion.specs.map(s => `${s.name}: ${s.value}`).join("\n"));
            }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ["make", "Make"],
                  ["model", "Model"],
                  ["transmission", "Transmission"],
                  ["drivetrain", "Drivetrain"],
                  ["powertrain", "Engine or motor"],
                  ["efficiency", "Range or fuel economy"],
                ] as const
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  htmlFor={`vehicle-${key}`}
                  required
                >
                  <Input
                    id={`vehicle-${key}`}
                    required
                    maxLength={
                      key === "powertrain" || key === "efficiency"
                        ? 300
                        : key === "model"
                          ? 150
                          : 100
                    }
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                  />
                </Field>
              ))}
              <Field label="Body type" htmlFor="vehicle-body">
                <select
                  id="vehicle-body"
                  className="w-full border rounded-md p-2"
                  value={draft.bodyType}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      bodyType: e.target.value as Vehicle["bodyType"],
                    }))
                  }
                >
                  {Object.entries(BODY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fuel" htmlFor="vehicle-fuel">
                <select
                  id="vehicle-fuel"
                  className="w-full border rounded-md p-2"
                  value={draft.fuel}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      fuel: e.target.value as Vehicle["fuel"],
                    }))
                  }
                >
                  {Object.entries(FUEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Seats" htmlFor="vehicle-seats" required>
                <Input
                  id="vehicle-seats"
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={draft.seats}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, seats: e.target.valueAsNumber }))
                  }
                />
              </Field>
              <Field
                label="Estimated landed price (GBP)"
                htmlFor="vehicle-price"
                required
                hint="Vehicle plus sea freight, excluding destination duty and taxes."
              >
                <Input
                  id="vehicle-price"
                  type="number"
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  required
                  value={draft.landedPrice}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      landedPrice: e.target.valueAsNumber,
                    }))
                  }
                />
              </Field>
              {([0, 1] as const).map((index) => (
                <Field
                  key={index}
                  label={`${index ? "Maximum" : "Minimum"} lead time (weeks)`}
                  htmlFor={`vehicle-lead-${index}`}
                  required
                >
                  <Input
                    id={`vehicle-lead-${index}`}
                    type="number"
                    required
                    min={1}
                    max={520}
                    value={draft.leadTimeWeeks[index]}
                    onChange={(e) => {
                      const leadTimeWeeks: [number, number] = [
                        ...draft.leadTimeWeeks,
                      ];
                      leadTimeWeeks[index] = e.target.valueAsNumber;
                      setDraft((d) => ({ ...d, leadTimeWeeks }));
                    }}
                  />
                </Field>
              ))}
            </div>
            <Field
              label="Highlights"
              htmlFor="vehicle-highlights"
              hint="One selling point per line, up to 12."
            >
              <Textarea
                id="vehicle-highlights"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </Field>
            <Field label="Description" htmlFor="vehicle-description" required>
              <Textarea
                id="vehicle-description"
                required
                maxLength={10000}
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
            </Field>
          </fieldset>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending || uploading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || uploading}>
              {uploading
                ? "Uploading photos…"
                : save.isPending
                  ? "Saving…"
                  : vehicle
                    ? "Save changes"
                    : "Save unpublished vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
