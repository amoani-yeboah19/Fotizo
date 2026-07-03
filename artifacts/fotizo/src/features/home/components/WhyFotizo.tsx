import { motion } from "framer-motion";
import { Globe2, ShieldCheck, UserCheck, FastForward, Headset, BadgeDollarSign } from "lucide-react";

const features = [
  {
    icon: Globe2,
    title: "Global Reach",
    description: "Connect with buyers and sellers from over 150 countries worldwide."
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "Bank-grade encryption and secure escrow for all your transactions."
  },
  {
    icon: UserCheck,
    title: "Verified Sellers",
    description: "Every professional and seller undergoes a rigorous vetting process."
  },
  {
    icon: FastForward,
    title: "Fast Delivery",
    description: "Optimized logistics networks ensuring your products arrive on time."
  },
  {
    icon: Headset,
    title: "24/7 Support",
    description: "Round-the-clock customer service to assist you whenever you need."
  },
  {
    icon: BadgeDollarSign,
    title: "Money-Back Guarantee",
    description: "Shop with confidence. Full refunds if expectations aren't met."
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function WhyFotizo() {
  return (
    <section className="py-24 bg-primary text-white overflow-hidden">
      <div className="container-app relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why choose Fotizo?</h2>
          <p className="text-primary-foreground/80 text-lg">
            We've built a platform that prioritizes trust, quality, and seamless experiences above all else.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              variants={item}
              className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-colors duration-300"
            >
              <div className="w-14 h-14 bg-white text-primary rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-primary-foreground/70 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
