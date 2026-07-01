import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-background" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Content */}
          <div className="max-w-2xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              The global marketplace to <span className="text-primary">Buy, Sell, Hire, Offer,</span> and <span className="text-accent">Grow</span>.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-lg text-muted-foreground leading-relaxed"
            >
              Discover premium products and world-class professionals. Fotizo connects discerning buyers with exceptional sellers and talent worldwide.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 p-2 bg-white rounded-2xl shadow-lg border border-border/50 flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex-1 w-full flex items-center px-4 py-2 border-b sm:border-b-0 sm:border-r border-border">
                <Search className="w-5 h-5 text-muted-foreground mr-3" />
                <input 
                  type="text" 
                  placeholder="What are you looking for?" 
                  className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="w-full sm:w-auto flex items-center px-4 py-2 border-b sm:border-b-0 sm:border-r border-border cursor-pointer text-sm font-medium">
                <span className="mr-2">All Categories</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl px-8 py-6 sm:py-2 h-auto text-base">
                Search
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-base font-medium">
                Explore Marketplace
              </Button>
              <Button variant="outline" className="rounded-full px-8 py-6 text-base font-medium border-primary/20 hover:bg-primary/5 text-primary">
                Start Selling
              </Button>
            </motion.div>
          </div>

          {/* Right: Editorial Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative h-[400px] lg:h-[600px] w-full rounded-[2rem] overflow-hidden shadow-2xl"
          >
            <img 
              src="/images/hero.png" 
              alt="Premium marketplace collection" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/5" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
