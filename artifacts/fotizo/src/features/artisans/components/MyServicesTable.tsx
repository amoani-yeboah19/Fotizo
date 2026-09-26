import { useState } from "react";
import { Link } from "wouter";
import { Briefcase, Edit2, Eye, EyeOff, Plus, RotateCcw } from "lucide-react";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ModerationNote } from "@/components/common/ModerationNote";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/api";
import { useMyServices, useSetServiceStatus } from "@/features/artisans/hooks";
import type { Service } from "@/types";

/** The provider's own service listings, with edit, withdraw and republish. */
export function MyServicesTable() {
  const { data: services = [], isLoading, isError, refetch } = useMyServices();
  const setStatus = useSetServiceStatus();
  const { toast } = useToast();
  const [pendingWithdraw, setPendingWithdraw] = useState<Service | null>(null);

  const change = (service: Service, status: "active" | "unpublished") =>
    setStatus.mutate(
      { id: service.id, status },
      {
        onSuccess: () =>
          toast({
            title: status === "active" ? "Service republished" : "Service withdrawn",
            description:
              status === "active"
                ? `${service.title} is visible to customers again.`
                : `${service.title} is hidden from customers. Existing bookings are kept.`,
          }),
        onError: (error) =>
          toast({ variant: "destructive", title: "Service not updated", description: apiErrorMessage(error, "Please try again.") }),
        onSettled: () => setPendingWithdraw(null),
      },
    );

  return (
    <SurfaceCard className="overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h3 className="text-lg font-bold">My Services</h3>
        <Link href="/dashboard/seller/services/new">
          <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Add Service</Button>
        </Link>
      </div>
      {isLoading ? (
        <p role="status" className="p-6 text-sm text-muted-foreground">Loading your services…</p>
      ) : isError ? (
        <div role="alert" className="p-6 text-sm">
          Your services could not be loaded.{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : services.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-semibold text-foreground">No services yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Offer a service so customers can book you.</p>
          <Link href="/dashboard/seller/services/new">
            <Button className="mt-4 gap-2"><Plus className="w-4 h-4" aria-hidden="true" /> Offer your first service</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium">Hourly rate</th>
                <th className="px-6 py-4 font-medium">Packages</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {services.map((service) => {
                const live = service.status !== "unpublished";
                return (
                  <tr key={service.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img loading="lazy" decoding="async" src={service.avatar} alt="" className="w-10 h-10 rounded-full bg-muted object-cover" />
                        <span className="font-medium">{service.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium"><Price amount={service.hourlyRate} /></td>
                    <td className="px-6 py-4">{service.packages.length}</td>
                    <td className="px-6 py-4">
                      <StatusBadge tone={live ? "success" : "warning"}>{live ? "active" : "withdrawn"}</StatusBadge>
                      <ModerationNote moderation={service.moderation} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {live && (
                          <Link href={`/services/${service.id}`}>
                            <Button aria-label={`View ${service.title}`} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Button>
                          </Link>
                        )}
                        <Link href={`/dashboard/seller/services/${service.id}/edit`}>
                          <Button aria-label={`Edit ${service.title}`} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                        </Link>
                        {live ? (
                          <Button
                            aria-label={`Withdraw ${service.title}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={setStatus.isPending}
                            onClick={() => setPendingWithdraw(service)}
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            aria-label={`Republish ${service.title}`}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            disabled={setStatus.isPending}
                            onClick={() => change(service, "active")}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingWithdraw !== null}
        onOpenChange={(o) => {
          if (!o) setPendingWithdraw(null);
        }}
        title="Withdraw service?"
        description={
          pendingWithdraw
            ? `"${pendingWithdraw.title}" will be hidden from customers. Existing bookings are kept, and you can republish it any time.`
            : undefined
        }
        confirmLabel="Withdraw"
        onConfirm={() => pendingWithdraw && change(pendingWithdraw, "unpublished")}
        loading={setStatus.isPending}
        destructive
      />
    </SurfaceCard>
  );
}
