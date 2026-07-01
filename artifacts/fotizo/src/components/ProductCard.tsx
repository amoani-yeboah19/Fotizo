import { Heart, Star, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";

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

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-muted p-6 flex items-center justify-center">
        <img 
          src={product.image} 
          alt={product.title} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
        <button className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm text-muted-foreground hover:text-accent hover:bg-white transition-colors">
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
          <span className="flex items-center text-foreground">
            <Star className="w-3 h-3 fill-accent text-accent mr-1" />
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground ml-1">({product.reviewCount})</span>
          </span>
        </div>
        <h3 className="font-semibold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
          {product.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">by {product.seller}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90 text-white w-10 h-10 shadow-sm">
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
