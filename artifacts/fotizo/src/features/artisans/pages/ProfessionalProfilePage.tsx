import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Briefcase, MapPin, Globe, Star, UserRound } from "lucide-react";
import { serviceCategoryLabel } from "@workspace/service-taxonomy";
import { PageLayout } from "@/components/layout/PageLayout";
import { Loading } from "@/components/common/QueryStates";
import { EmptyState } from "@/components/common/EmptyState";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";
import { Price } from "@/components/common/Price";
import { Button } from "@/components/ui/button";
import { profileChoiceLabel } from "@/features/settings/profile";
import { publicProfileService } from "../services/public-profile.service";

/** A professional's public page: what they publish about themselves and their live services. */
export default function ProfessionalProfilePage() {
  const [, params] = useRoute("/professionals/:id");
  const id = params?.id ?? "";
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => publicProfileService.get(id),
    enabled: Boolean(id),
    retry: false,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <Loading label="Loading profile…" />
      </PageLayout>
    );
  }
  if (isError || !profile) {
    return (
      <PageLayout>
        <EmptyState
          icon={<UserRound className="w-12 h-12" />}
          title="Profile not available"
          description="This professional's profile isn't public right now."
          action={
            <Link href="/services">
              <Button>Browse services</Button>
            </Link>
          }
        />
      </PageLayout>
    );
  }

  const experience = profileChoiceLabel("experience", profile.experience);
  const workMode = profileChoiceLabel("workMode", profile.workMode);
  const avatar = profile.avatar ?? profile.services[0]?.avatar;
  return (
    <PageLayout mainClassName="container-app py-12">
      <SurfaceCard className="p-6 md:p-8 mb-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {avatar ? (
            <img src={avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover bg-muted shrink-0" />
          ) : (
            <InitialsAvatar name={profile.name} className="w-24 h-24 text-2xl shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              {profile.verified && <CheckCircle2 className="w-5 h-5 text-primary" aria-label="Verified by Fotizo" />}
            </div>
            {profile.headline && <p className="mt-2 text-lg text-muted-foreground">{profile.headline}</p>}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {experience && (
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> {experience} experience
                </span>
              )}
              {workMode && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {workMode}
                </span>
              )}
              <span>Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="w-4 h-4" /> Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile.about || `${profile.name} hasn't added an introduction yet.`}
            </p>
          </div>
          {profile.skills.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Skills &amp; Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold mb-4">Services</h2>
          {profile.services.length ? (
            <div className="space-y-3">
              {profile.services.map((service) => (
                <Link key={service.id} href={`/services/${service.id}`}>
                  <SurfaceCard className="p-4 hover:border-primary/40 transition-colors cursor-pointer">
                    <p className="font-semibold">{service.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{serviceCategoryLabel(service.category)}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-accent text-accent" /> {service.rating} ({service.reviewCount})
                      </span>
                      <span>
                        From <Price amount={service.hourlyRate} className="font-semibold" />
                      </span>
                    </div>
                  </SurfaceCard>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No services are listed right now.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
