import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

export default function CartPage() {
  const { items, total, updateQuantity, removeItem } = useCart();

  const shipping = total > 50 ? 0 : 5.99;
  const grandTotal = total + (items.length > 0 ? shipping : 0);

  return (
    <PageLayout mainClassName="container mx-auto px-4 lg:px-8 py-24">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <SurfaceCard className="p-12 text-center max-w-2xl mx-auto mt-12 shadow-none">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any products to your cart yet.
          </p>
          <Link href="/products">
            <Button size="lg" className="rounded-full px-8">Browse Products</Button>
          </Link>
        </SurfaceCard>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <SurfaceCard className="overflow-hidden shadow-none">
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y border-border">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                    <div className="col-span-6 flex items-center gap-4 w-full">
                      <div className="w-20 h-20 bg-muted rounded-xl p-2 shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.productId}`}>
                          <h4 className="font-semibold text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                            {item.title}
                          </h4>
                        </Link>
                        <p className="text-sm text-muted-foreground">by {item.seller}</p>
                        {/* Mobile price and remove */}
                        <div className="sm:hidden flex items-center justify-between mt-2">
                          <Price amount={item.price} className="font-bold" />
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-destructive text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 hidden sm:block text-center font-medium">
                      <Price amount={item.price} />
                    </div>

                    <div className="col-span-2 flex justify-center w-full sm:w-auto">
                      <div className="flex items-center border border-border rounded-full bg-white">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2 hidden sm:flex items-center justify-end gap-4 w-full">
                      <Price amount={item.price * item.quantity} className="font-bold" />
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <div className="mt-6 flex justify-between items-center">
              <Link href="/products">
                <Button variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <SurfaceCard className="p-6 sticky top-24 shadow-none">
              <h3 className="text-lg font-bold mb-6">Order Summary</h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <Price amount={total} className="text-foreground font-medium" />
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-foreground font-medium">
                    {shipping === 0 ? "Free" : <Price amount={shipping} />}
                  </span>
                </div>
                {shipping > 0 && (
                  <div className="text-xs text-accent bg-accent/10 p-2 rounded-lg text-center">
                    Spend <Price amount={50 - total} /> more for free shipping!
                  </div>
                )}
              </div>

              <div className="h-px bg-border mb-6" />

              <div className="flex justify-between mb-8">
                <span className="text-lg font-bold">Total</span>
                <Price amount={grandTotal} className="text-2xl font-bold text-primary" />
              </div>

              <Link href="/checkout">
                <Button size="lg" className="w-full rounded-full text-lg h-14">
                  Proceed to Checkout
                </Button>
              </Link>
            </SurfaceCard>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
