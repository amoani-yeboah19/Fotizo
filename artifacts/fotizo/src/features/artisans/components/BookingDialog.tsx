import { Button } from "@/components/ui/button";
export function BookingDialog(_props: {
  providerName: string;
  packageName: string;
  packagePrice: number;
}) {
  return (
    <div className="space-y-2">
      <Button className="w-full" disabled>
        Online booking unavailable
      </Button>
      <p className="text-sm text-muted-foreground">
        Online scheduling is being prepared. You can message the provider to
        discuss this service.
      </p>
    </div>
  );
}
