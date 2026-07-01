import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { services } from "@/data/mockData";
import { useCurrency } from "@/context/CurrencyContext";
import { useMessages } from "@/context/MessagesContext";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle2, ChevronRight, MessageSquare, Clock, Briefcase, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ServiceDetail() {
  const [, params] = useRoute("/services/:id");
  const [, setLocation] = useLocation();
  const service = services.find(s => s.id === params?.id);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const { format } = useCurrency();
  const { startConversation } = useMessages();
  const { toast } = useToast();

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Service not found</h2>
            <Link href="/services">
              <Button>Back to Services</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleMessageProvider = () => {
    const convId = startConversation({
      id: service.providerId,
      name: service.provider,
      avatar: service.avatar,
      role: "Professional"
    }, `Inquiry: ${service.title}`);
    setLocation(`/messages/${convId}`);
  };

  const handleBook = () => {
    if (!bookingDate || !bookingTime) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select a date and time for your booking."
      });
      return;
    }
    toast({
      title: "Booking confirmed!",
      description: "Check your dashboard for details."
    });
    setIsBookingOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/"><span className="hover:text-primary cursor-pointer">Home</span></Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/services"><span className="hover:text-primary cursor-pointer">Services</span></Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span>{service.category}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {service.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <img src={service.avatar} alt={service.provider} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{service.provider}</p>
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">{service.category} Expert</p>
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-accent text-accent" />
                <span className="font-bold">{service.rating}</span>
                <span className="text-muted-foreground">({service.reviewCount} reviews)</span>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-5 h-5" />
                <span>{service.experience} exp.</span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">About this service</h2>
              <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">
                {service.description}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Skills & Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {service.skills.map(skill => (
                  <span key={skill} className="bg-muted px-4 py-2 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white border border-border rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Packages</h3>
                <span className="text-muted-foreground">{service.availability}</span>
              </div>
              
              <div className="space-y-4">
                {service.packages.map((pkg, i) => (
                  <div key={i} className="border border-border rounded-xl p-4 hover:border-primary transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">{pkg.name}</h4>
                      <span className="font-bold text-lg">{format(pkg.price)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 h-10">{pkg.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Clock className="w-4 h-4" /> {pkg.delivery} delivery
                    </div>
                    
                    <Dialog open={isBookingOpen && selectedPackage?.name === pkg.name} onOpenChange={(open) => {
                      setIsBookingOpen(open);
                      if (open) setSelectedPackage(pkg);
                    }}>
                      <DialogTrigger asChild>
                        <Button className="w-full">Book Now</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Book {service.provider}</DialogTitle>
                          <DialogDescription>
                            Package: {pkg.name} ({format(pkg.price)})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input 
                              id="date" 
                              type="date" 
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="time">Time</Label>
                            <Input 
                              id="time" 
                              type="time" 
                              value={bookingTime}
                              onChange={(e) => setBookingTime(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea 
                              id="message" 
                              placeholder="Tell the provider what you need help with..."
                              value={bookingMessage}
                              onChange={(e) => setBookingMessage(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleBook}>Confirm Booking</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <Button variant="outline" className="w-full gap-2" onClick={handleMessageProvider}>
                  <MessageSquare className="w-4 h-4" /> Message Provider
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
