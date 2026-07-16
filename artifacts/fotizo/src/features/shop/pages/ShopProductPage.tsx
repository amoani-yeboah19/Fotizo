import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Star, Truck, ShieldCheck, Flame, Minus, Plus, ShoppingCart, ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ShopProductCard, SHOP_SELLER } from "@/features/shop/components/ShopProductCard";
import {
  getShopProduct,
  relatedShopProducts,
  discountPct,
  soldLabel,
  categoryLabel,
} from "@/features/shop/data/products";

export default function ShopProductPage() {
  const [, params] = useRoute("/shop/:id");
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();

  const product = params?.id ? getShopProduct(params.id) : undefined;
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <PageLayout footer={false} mainClassName="container-app py-28">
        <EmptyState
          title="Product not found"
          description="This item may have sold out or been removed."
          action={<Button onClick={() => setLocation("/shop")}>Back to shop</Button>}
        />
      </PageLayout>
    );
  }

  const off = discountPct(product);

  const add = (goToCart: boolean) => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: `shop-${product.id}`,
        productId: `shop-${product.id}`,
        title: product.title,
        price: product.price,
        image: product.image,
        seller: SHOP_SELLER,
      });
    }
    if (goToCart) {
      setLocation("/cart");
    } else {
      toast({ title: "Added to cart", description: `${qty} × ${product.title}` });
    }
  };

  const related = relatedShopProducts(product);

  return (
    <PageLayout mainClassName="container-app py-24 md:py-28">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/shop"><span className="hover:text-primary cursor-pointer">Shop</span></Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <Link href="/shop"><span className="hover:text-primary cursor-pointer">{categoryLabel(product.category)}</span></Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="truncate text-foreground">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={product.images[activeImg] ?? product.image}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {product.images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <h1 className="text-xl font-bold leading-snug text-foreground sm:text-2xl">{product.title}</h1>

          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
            </span>
            <span>·</span>
            <span>{soldLabel(product.sold)}</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <Price amount={product.price} className="text-3xl font-extrabold text-[#FF6A00]" />
            {product.originalPrice > product.price && (
              <Price amount={product.originalPrice} className="text-base text-muted-foreground line-through" />
            )}
            {off > 0 && (
              <span className="rounded-full bg-[#FF6A00]/10 px-2 py-1 text-xs font-bold text-[#FF6A00]">
                -{off}%
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.freeShipping && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Free shipping
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Buyer protection
            </span>
            {product.almostGone && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6A00]/10 px-2.5 py-1 text-xs font-semibold text-[#FF6A00]">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" /> Almost gone
              </span>
            )}
          </div>

          {/* Quantity */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Quantity</span>
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={qty <= 1}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => add(false)}>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
            </Button>
            <Button className="flex-1 bg-[#FF6A00] text-white hover:bg-[#FF6A00]/90" onClick={() => add(true)}>
              Buy now
            </Button>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h2 className="mb-2 text-sm font-bold text-foreground">Description</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold text-foreground">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {related.map((p) => (
              <ShopProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
