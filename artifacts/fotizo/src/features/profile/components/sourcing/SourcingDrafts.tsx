import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  draftFields,
  validateDraft,
  useSourcingDrafts,
  type DraftKind,
  type SourcingDraft,
} from "./drafts";
import { selectClass, exportCsv } from "./utils";
const titles = {
  supplier: "Supplier network",
  shipment: "Outbound shipments",
  reorder: "Reorder requests",
};
const actions = {
  supplier: "Add supplier",
  shipment: "New consignment",
  reorder: "New reorder request",
};
export function DraftEditor({
  kind,
  existing,
  initial = {},
  close,
  onSaved,
}: {
  kind: DraftKind;
  existing?: SourcingDraft;
  initial?: Record<string, string>;
  close: () => void;
  onSaved?: () => void;
}) {
  const store = useSourcingDrafts();
  const [values, setValues] = useState<Record<string, string>>(
    existing?.values ?? initial,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const invalid = validateDraft(kind, values);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    try {
      await store.save({
        id: existing?.id ?? crypto.randomUUID(),
        kind,
        values: Object.fromEntries(
          draftFields[kind].map((f) => [f.key, (values[f.key] ?? "").trim()]),
        ),
        updatedAt: new Date().toISOString(),
      });
      onSaved?.();
      close();
    } catch {
      setError(
        "This draft could not be saved on your browser. Check storage access and retry. Your entries are still here.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) close();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>{existing ? "Edit draft" : actions[kind]}</DialogTitle>
        <DialogDescription>
          Saved only on this browser for your account. This does not submit an
          order, book freight or approve a supplier.
        </DialogDescription>
        <form onSubmit={submit}>
          <fieldset disabled={saving} className="space-y-4">
            {draftFields[kind].map((f) => (
              <div key={f.key} className="space-y-1">
                <label
                  htmlFor={`draft-${f.key}`}
                  className="text-sm font-medium"
                >
                  {f.label}
                  {!f.required && " (optional)"}
                </label>
                {f.options ? (
                  <select
                    id={`draft-${f.key}`}
                    required={f.required}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                    className={`${selectClass} w-full`}
                  >
                    <option value="">Select an option</option>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`draft-${f.key}`}
                    required={f.required}
                    type={f.type ?? "text"}
                    min={f.type === "number" ? 1 : undefined}
                    max={f.type === "number" ? 1000000 : undefined}
                    step={f.type === "number" ? 1 : undefined}
                    maxLength={1000}
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit">Save draft</Button>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function SourcingDrafts({ kind }: { kind: DraftKind }) {
  const store = useSourcingDrafts();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<SourcingDraft | "new" | null>(null);
  const [selected, setSelected] = useState<SourcingDraft | null>(null);
  const [message, setMessage] = useState("");
  const fields = draftFields[kind];
  const statuses = fields.find((f) => f.key === "status")?.options;
  const rows = (store.data ?? []).filter(
    (d) =>
      d.kind === kind &&
      Object.values(d.values)
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (status === "all" || d.values.status === status),
  );
  const columns = fields
    .filter(
      (f) =>
        f.key !== "notes" &&
        f.key !== "email" &&
        f.key !== "contact" &&
        f.key !== "origin",
    )
    .slice(0, 5);
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b space-y-3">
        <div className="flex flex-wrap justify-between gap-3">
          <h3 className="text-lg font-bold">{titles[kind]}</h3>
          <Button
            disabled={store.isLoading || store.isError}
            onClick={() => {
              setMessage("");
              setEdit("new");
            }}
          >
            {actions[kind]}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Browser drafts · Not synced with your team or submitted for
          processing.
        </p>
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
      </div>
      <div className="p-4 flex flex-wrap gap-3">
        <Input
          aria-label={`Search ${kind} drafts`}
          placeholder="Search drafts"
          className="sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {statuses && (
          <select
            aria-label={`Filter ${kind} status`}
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            exportCsv(`${kind}-drafts.csv`, [
              ["Draft ID", ...fields.map((f) => f.label), "Updated"],
              ...rows.map((r) => [
                r.id,
                ...fields.map((f) => r.values[f.key]),
                r.updatedAt,
              ]),
            ])
          }
        >
          Export drafts
        </Button>
      </div>
      {store.isError ? (
        <div role="alert" className="p-6">
          Drafts could not be read.{" "}
          <Button variant="outline" onClick={() => void store.refetch()}>
            Retry
          </Button>
        </div>
      ) : store.isLoading ? (
        <p role="status" className="p-6">
          Loading drafts…
        </p>
      ) : !rows.length ? (
        <p className="p-6 text-muted-foreground">
          {search || status !== "all"
            ? "No drafts match your filters."
            : "No drafts yet. Create one to prepare the details."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((f) => (
                  <th className="p-4" key={f.key}>
                    {f.label}
                  </th>
                ))}
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((f) => (
                    <td className="p-4" key={f.key}>
                      {r.values[f.key] || "—"}
                    </td>
                  ))}
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(r)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEdit(r)}
                      >
                        Edit draft
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <DraftEditor
          kind={kind}
          existing={edit === "new" ? undefined : edit}
          close={() => setEdit(null)}
          onSaved={() =>
            setMessage(
              "Draft saved on this browser. It has not been submitted or synced.",
            )
          }
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Draft details</DialogTitle>
          <DialogDescription>
            Local browser draft. No live operation has been performed.
          </DialogDescription>
          <dl className="space-y-3">
            {selected &&
              fields.map((f) => (
                <div key={f.key}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm whitespace-pre-wrap break-words">
                    {selected.values[f.key] || "—"}
                  </dd>
                </div>
              ))}
          </dl>
          <Button
            onClick={() => {
              setEdit(selected);
              setSelected(null);
            }}
          >
            Edit draft
          </Button>
        </DialogContent>
      </Dialog>
    </SurfaceCard>
  );
}
