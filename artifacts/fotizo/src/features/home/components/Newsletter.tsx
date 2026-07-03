import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  return (
    <section className="py-20 bg-white border-t border-border/50">
      <div className="container-app">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-muted rounded-[2.5rem] p-10 lg:p-16 text-center relative overflow-hidden"
        >
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Join 2 million+ buyers and sellers
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Subscribe to our newsletter for exclusive deals, new feature announcements, and marketplace insights.
            </p>
            
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 px-6 py-4 rounded-full border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                required
              />
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 py-4 h-auto text-base font-semibold shadow-md">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">
              We care about your data in our <a href="#" className="underline hover:text-foreground">privacy policy</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
