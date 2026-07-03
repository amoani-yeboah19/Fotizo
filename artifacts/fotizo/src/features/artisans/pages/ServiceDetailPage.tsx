import { useRoute, Link, useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useService } from "@/features/artisans/hooks";
import { Loading } from "@/components/common/QueryStates";
import { EmptyState } from "@/components/common/EmptyState";
import { Price } from "@/components/common/Price";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { BookingDialog } from "@/features/artisans/components/BookingDialog";
import { useMessages } from "@/contexts/MessagesContext";
import { Star, CheckCircle2, ChevronRight, MessageSquare, Clock, Briefcase } from "lucide-react";

export default function ServiceDetail() {
  const [, params] = useRoute("/services/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const { data: service, isLoading } = useService(id);
  const { startConversation } = useMessages();

  if (isLoading) {
    return (
      <PageLayout>
        <Loading label="Loading service…" />
      </PageLayout>
    );
  }

  if (!service) {
    return (
      <PageLayout footer={false}>
        <EmptyState
          title="Service not found"
          action={
            <Link href="/services">
              <Button>Back to Services</Button>
            </Link>
          }
        />
      </PageLayout>
    );
  }

  const handleMessageProvider = () => {
    const convId = startConversation(
      {
        id: service.providerId,
        name: service.provider,
        avatar: service.avatar,
        role: "Professional",
      },
      `Inquiry: ${service.title}`,
    );
    setLocation(`/messages/${convId}`);
  };

  return (
    <PageLayout mainClassName="container-app py-24">
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
              <img loading="lazy" decoding="async" src={service.avatar} alt={service.provider} className="w-12 h-12 rounded-full object-cover" />
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
            <h2 className="text-xl font-bold mb-4">Skills &amp; Expertise</h2>
            <div className="flex flex-wrap gap-2">
              {service.skills.map((skill) => (
                <span key={skill} className="bg-muted px-4 py-2 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <SurfaceCard className="p-6 sticky top-24 shadow-none">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Packages</h3>
              <span className="text-muted-foreground">{service.availability}</span>
            </div>

            <div className="space-y-4">
              {service.packages.map((pkg, i) => (
                <div key={i} className="border border-border rounded-xl p-4 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{pkg.name}</h4>
                    <Price amount={pkg.price} className="font-bold text-lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 h-10">{pkg.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="w-4 h-4" /> {pkg.delivery} delivery
                  </div>
                  <BookingDialog
                    providerName={service.provider}
                    packageName={pkg.name}
                    packagePrice={pkg.price}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <Button variant="outline" className="w-full gap-2" onClick={handleMessageProvider}>
                <MessageSquare className="w-4 h-4" /> Message Provider
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageLayout>
  );
}
