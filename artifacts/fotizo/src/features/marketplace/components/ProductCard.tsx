import { memo } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/common/Price";
import { RatingStars } from "@/components/common/RatingStars";

interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviewCount: number;
  seller: string;
  category: string;
  image: string;
}

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`}>
      <div className="group flex flex-col bg-white rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
        <div className="relative aspect-square overflow-hidden bg-muted p-6 flex items-center justify-center">
          <img loading="lazy" decoding="async" 
            src={product.image} 
            alt={product.title} 
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
          <button
            aria-label="Add to wishlist"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm text-muted-foreground hover:text-accent hover:bg-white transition-colors"
            onClick={(e) => { e.preventDefault(); /* Add wishlist logic */ }}
          >
            <Heart className="w-5 h-5" />
          </button>
          {product.originalPrice && (
            <div className="absolute top-4 left-4 px-2.5 py-1 bg-accent text-white text-xs font-bold rounded-full">
              Sale
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
            <span>{product.category}</span>
            <RatingStars
              value={product.rating}
              reviewCount={product.reviewCount}
              starClassName="w-3 h-3 mr-1"
              className="text-foreground"
            />
          </div>
          <h3 className="font-semibold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">by {product.seller}</p>
          
          <div className="mt-auto flex items-center justify-between">
            <div className="flex flex-col">
              <Price amount={product.price} className="text-lg font-bold text-foreground" />
              {product.originalPrice && (
                <Price
                  amount={product.originalPrice}
                  className="text-sm text-muted-foreground line-through"
                />
              )}
            </div>
            <Button
              aria-label="Add to cart"
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 text-white w-10 h-10 shadow-sm"
              onClick={(e) => {
                e.preventDefault(); 
                // Context Add logic goes here, handled in detailed view usually but could be here
              }}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
});
