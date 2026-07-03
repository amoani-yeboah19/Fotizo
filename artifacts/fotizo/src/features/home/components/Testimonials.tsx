import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useTestimonials } from "@/features/home/hooks";
import { RatingStars } from "@/components/common/RatingStars";

export function Testimonials() {
  const { data: testimonials = [] } = useTestimonials();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-foreground">Trusted by professionals</h2>
          <p className="text-muted-foreground mt-4">
            Hear from the buyers, sellers, and service providers who use Fotizo every day.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-border shadow-sm relative flex flex-col"
            >
              <Quote className="absolute top-8 right-8 w-10 h-10 text-muted/50" />
              <RatingStars count={testimonial.rating} className="mb-6" />
              <p className="text-foreground text-lg leading-relaxed mb-8 flex-1 italic">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name} 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
