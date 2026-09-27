import { useState } from "react";
import { useStaffQuery, Failure, Paging } from "../Operations";
import {
  operationsService,
  type SellerSummary,
} from "../../services/operations.service";
import { AUTH_USE_MOCKS } from "@/api";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportCsv } from "./utils";
export function RegionalSellers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SellerSummary | null>(null);
  const query = useStaffQuery(["sellers", page, search], () =>
    operationsService.sellers(page, search.trim()),
  );
  const rows = query.data?.items ?? [];
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b flex flex-wrap gap-3 justify-between">
        <h3 className="font-bold text-lg">Sellers</h3>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            exportCsv("sellers-current-page.csv", [
              [
                "ID",
                "Name",
                "Email",
                "Active listings",
                "Order value GBP",
                "Status",
              ],
              ...rows.map((s) => [
                s.id,
                s.name,
                s.email,
                s.activeListings,
                s.orderValue,
                s.suspendedAt ? "Suspended" : "Active",
              ]),
            ])
          }
        >
          Export current page
        </Button>
      </div>
      <div className="p-4">
        <Input
          aria-label="Search sellers"
          placeholder="Search sellers"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {AUTH_USE_MOCKS ? (
        <p className="p-6 text-muted-foreground">
          Seller records are available with a live staff account.
        </p>
      ) : query.isError ? (
        <Failure retry={() => void query.refetch()} />
      ) : !query.data ? (
        <p role="status" className="p-6">
          Loading sellers…
        </p>
      ) : !rows.length ? (
        <p className="p-6">No sellers match your search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50">
              <tr>
                {["Seller", "Listings", "Order value", "Status", "Action"].map(
                  (t) => (
                    <th className="p-4" key={t}>
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="p-4">{s.name}</td>
                  <td className="p-4">{s.activeListings}</td>
                  <td className="p-4">
                    <Price amount={s.orderValue} />
                  </td>
                  <td className="p-4">
                    {s.suspendedAt ? "Suspended" : "Active"}
                  </td>
                  <td className="p-4">
                    <Button variant="outline" onClick={() => setSelected(s)}>
                      View details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && (
        <Paging
          page={page}
          hasMore={query.data.hasMore}
          pending={query.isFetching}
          change={setPage}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Seller details</DialogTitle>
          <DialogDescription>
            Account summary. Account restrictions are managed by administrators.
          </DialogDescription>
          {selected && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt>Name</dt>
              <dd>{selected.name}</dd>
              <dt>Email</dt>
              <dd className="break-all">{selected.email}</dd>
              <dt>Active listings</dt>
              <dd>{selected.activeListings}</dd>
              <dt>Order lines</dt>
              <dd>{selected.orderLines}</dd>
              <dt>Order value</dt>
              <dd>
                <Price amount={selected.orderValue} />
              </dd>
              <dt>Status</dt>
              <dd>{selected.suspendedAt ? "Suspended" : "Active"}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </SurfaceCard>
  );
}
