import { memo } from "react";
import { Link } from "wouter";
import { Star, Plus, Truck, Flame } from "lucide-react";
import { Price } from "@/components/common/Price";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { discountPct, soldLabel, type ShopProduct } from "@/features/shop/data/products";

export const SHOP_SELLER = "Fotizo Import";

export const ShopProductCard = memo(function ShopProductCard({ product }: { product: ShopProduct }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const off = discountPct(product);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: `shop-${product.id}`,
      productId: `shop-${product.id}`,
      title: product.title,
      price: product.price,
      image: product.image,
      seller: SHOP_SELLER,
    });
    toast({ title: "Added to cart", description: product.title });
  };

  return (
    <Link href={`/shop/${product.id}`}>
      <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-lg cursor-pointer">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            loading="lazy"
            decoding="async"
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {off > 0 && (
            <span className="absolute left-0 top-2 rounded-r-full bg-[#FF6A00] px-2 py-0.5 text-xs font-extrabold text-white shadow">
              -{off}%
            </span>
          )}
          {product.almostGone && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Flame className="h-3 w-3 text-[#FF6A00]" aria-hidden="true" /> Almost gone
            </span>
          )}
          <button
            type="button"
            aria-label={`Add ${product.title} to cart`}
            onClick={quickAdd}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-2.5">
          <h3 className="line-clamp-2 text-sm leading-snug text-foreground group-hover:text-primary">
            {product.title}
          </h3>

          <div className="mt-1.5 flex items-baseline gap-1.5">
            <Price amount={product.price} className="text-base font-extrabold text-[#FF6A00]" />
            {product.originalPrice > product.price && (
              <Price amount={product.originalPrice} className="text-xs text-muted-foreground line-through" />
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {product.rating.toFixed(1)}
            </span>
            <span>·</span>
            <span>{soldLabel(product.sold)}</span>
          </div>

          {product.freeShipping && (
            <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
              <Truck className="h-3 w-3" aria-hidden="true" /> Free shipping
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});
