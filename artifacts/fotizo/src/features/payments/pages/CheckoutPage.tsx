import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
export default function CheckoutPage() {
  return (
    <PageLayout mainClassName="container-app py-24">
      <section
        className="max-w-xl mx-auto space-y-4"
        aria-labelledby="checkout-title"
      >
        <h1 id="checkout-title" className="text-3xl font-bold">
          Checkout is not available yet
        </h1>
        <p>
          Online ordering is being prepared. No payment has been taken and no
          order has been placed.
        </p>
        <Link href="/cart">
          <Button>Return to your cart</Button>
        </Link>
      </section>
    </PageLayout>
  );
}
