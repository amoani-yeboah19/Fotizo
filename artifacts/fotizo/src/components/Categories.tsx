import { motion } from "framer-motion";
import { Monitor, Shirt, Home, Sparkles, Activity, BookOpen, Briefcase, Download, Coffee, Wrench } from "lucide-react";
import { categories } from "../data/mockData";

const iconMap: Record<string, React.ElementType> = {
  Monitor,
  Shirt,
  Home,
  Sparkles,
  Activity,
  BookOpen,
  Briefcase,
  Download,
  Coffee,
  Wrench
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export function Categories() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Explore Categories</h2>
            <p className="text-muted-foreground mt-2">Find exactly what you need from our global catalog.</p>
          </div>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon] || Sparkles;
            
            return (
              <motion.div
                key={category.id}
                variants={item}
                className="group cursor-pointer p-6 rounded-2xl border border-border/60 hover:border-primary/20 bg-background hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{category.name}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
