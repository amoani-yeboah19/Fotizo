import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
export default function OrderConfirmation() {
  return (
    <PageLayout mainClassName="container-app py-24">
      <section className="max-w-xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">No order to confirm</h1>
        <p>
          Online checkout is not available yet. Opening this page does not place
          an order.
        </p>
        <Link href="/cart">
          <Button>Return to your cart</Button>
        </Link>
      </section>
    </PageLayout>
  );
}
