import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { products } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { Star, Heart, MessageSquare, ChevronRight, Minus, Plus, Truck, ShieldCheck, ArrowLeft } from "lucide-react";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [, setLocation] = useLocation();
  const product = products.find(p => p.id === params?.id);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");

  const { addItem } = useCart();
  const { format } = useCurrency();
  const { toast } = useToast();

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Product not found</h2>
            <Link href="/products">
              <Button>Back to Products</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      seller: product.seller,
    });
    toast({
      title: "Added to cart",
      description: `${product.title} has been added to your cart.`,
    });
  };

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/"><span className="hover:text-primary cursor-pointer">Home</span></Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/products"><span className="hover:text-primary cursor-pointer">Products</span></Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span>{product.category}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white border border-border rounded-2xl p-8 flex items-center justify-center relative overflow-hidden">
              <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
              {product.originalPrice && (
                <div className="absolute top-6 left-6 px-3 py-1.5 bg-accent text-white text-sm font-bold rounded-full">
                  Sale
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <button key={i} className="w-24 h-24 shrink-0 bg-white border border-border rounded-xl p-2 hover:border-primary transition-colors">
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              {product.title}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center text-accent">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current opacity-50" />
              </div>
              <span className="text-sm font-medium">{product.rating} Rating</span>
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>

            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-bold text-primary">{format(product.price)}</span>
              {product.originalPrice && (
                <span className="text-xl text-muted-foreground line-through mb-1">
                  {format(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              {product.description}
            </p>

            <div className="bg-white border border-border rounded-xl p-4 mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sold by</p>
                <p className="font-semibold">{product.seller}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/messages")} className="gap-2">
                <MessageSquare className="w-4 h-4" /> Message Seller
              </Button>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center border border-border rounded-full bg-white h-12">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                  className="w-12 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button onClick={handleAddToCart} className="flex-1 h-12 text-lg rounded-full">
                Add to Cart
              </Button>
              
              <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shrink-0">
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground border-t border-border pt-8">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Free worldwide shipping
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> 30-day money-back guarantee
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-16">
          <div className="flex border-b border-border mb-8">
            {["description", "specifications", "reviews"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab 
                    ? "border-b-2 border-primary text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border p-8 min-h-[200px]">
            {activeTab === "description" && (
              <div className="prose max-w-none text-muted-foreground">
                <p>{product.description}</p>
                <p>Features premium materials and expert craftsmanship designed to last a lifetime. Fully backed by our comprehensive warranty and buyer protection guarantee.</p>
              </div>
            )}
            
            {activeTab === "specifications" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {product.specs && Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">{key}</span>
                    <span className="text-foreground text-right">{val as React.ReactNode}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Star className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Reviews functionality coming soon.</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-8">Related Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
