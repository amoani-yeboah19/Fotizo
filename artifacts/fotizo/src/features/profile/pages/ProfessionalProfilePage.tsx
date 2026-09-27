import { AUTH_USE_MOCKS } from "@/api";
import { AccountProfileForm } from "@/features/settings/components/AccountProfileForm";
import { useState } from "react";
import { Link } from "wouter";
import {
  MapPin,
  Languages,
  BriefcaseBusiness,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageLayout } from "@/components/layout/PageLayout";
import { InitialsAvatar } from "@/components/common/InitialsAvatar";
import { Button } from "@/components/ui/button";
import { ProfileFields } from "@/features/settings/components/ProfileFields";
import {
  readProfileDraft,
  saveProfileDraft,
  validateProfile,
} from "@/features/settings/profile";

export default function ProfessionalProfilePage() {
  const { user } = useAuth();
  if (AUTH_USE_MOCKS) return <DraftProfessionalProfilePage />;
  return <PageLayout mainClassName="container-app py-28"><header className="mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your professional identity</p><h1 className="text-3xl font-bold">Make your expertise stand out.</h1><p className="mt-3 text-muted-foreground">Manage the profile saved to your Fotizo account.</p></header>{user && <AccountProfileForm userId={user.id} role={user.role} />}{user?.role === "seller" && <Link href="/dashboard/seller?tab=services" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-white">Manage my services →</Link>}</PageLayout>;
}
function DraftProfessionalProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() =>
    readProfileDraft(user?.id ?? ""),
  );
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const checks = [
    {
      label: "Introduce your expertise",
      done:
        profile.headline.trim().length >= 10 &&
        profile.about.trim().length >= 80,
    },
    {
      label: "Add skills and experience",
      done:
        !!profile.skills.trim() && !!profile.experience && !!profile.workMode,
    },
    {
      label: "Set location and language",
      done: !!profile.country.trim() && !!profile.language.trim(),
    },
  ];
  const completed = checks.filter((c) => c.done).length;
  return (
    <PageLayout mainClassName="container-app py-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Your professional identity
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Make your expertise stand out.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Show clients what you do, how you work and what makes you the right
            person for their project.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(!editing);
            setMessage("");
            setError("");
          }}
        >
          {editing ? "View profile preview" : "Edit professional profile"}
        </Button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="rounded-2xl bg-[#08275B] p-6 text-white">
            {user?.avatar ? <img src={user.avatar} alt={user.name} className="mb-5 h-16 w-16 rounded-full object-cover" /> : <InitialsAvatar name={user?.name} className="mb-5 h-16 w-16 bg-white/15 text-xl text-white" />}
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="mt-2 text-sm text-white/70">
              {profile.headline ||
                "Your next chapter starts with your profile."}
            </p>
            <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm text-white/80">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {[profile.city, profile.country].filter(Boolean).join(", ") ||
                  "Add your location"}
              </p>
              <p className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                {profile.language || "Add your language"}
              </p>
              <p className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4" />
                {profile.workMode || "Choose how you work"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border p-5">
            <p className="font-semibold">Build your profile</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completed} of 3 sections completed
            </p>
            <progress
              aria-label="Profile completion"
              value={completed}
              max={3}
              className="mt-3 h-2 w-full accent-primary"
            />
            <ul className="mt-4 space-y-3">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? "bg-primary text-white" : "border"}`}
                  >
                    {c.done && <Check className="h-3 w-3" />}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div className="min-w-0 space-y-6">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Private preview · Your profile draft stays on this browser. It is
            not published to clients or synced across devices.
          </p>
          {editing ? (
            <form
              className="space-y-6 rounded-2xl border p-6 sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                setMessage("");
                const invalid = validateProfile(profile, "seller");
                if (invalid) {
                  setError(invalid);
                  return;
                }
                if (!user || !saveProfileDraft(user.id, profile)) {
                  setError(
                    "Your draft could not be saved. Please check browser storage and try again.",
                  );
                  return;
                }
                setError("");
                setMessage("Professional profile draft saved on this browser.");
                setEditing(false);
              }}
            >
              <h2 className="text-xl font-semibold">
                Tell your professional story
              </h2>
              <ProfileFields
                prefix="professional"
                role="seller"
                value={profile}
                onChange={(next) => {
                  setProfile(next);
                  setError("");
                }}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit">Save profile draft</Button>
            </form>
          ) : (
            <>
              <section className="rounded-2xl border p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  About me
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  {profile.headline ||
                    "A clear headline. A memorable first impression."}
                </h2>
                <p className="mt-5 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {profile.about ||
                    "Introduce your experience, the problems you solve and the results clients can expect. Use your own words to tell your story."}
                </p>
              </section>
              <section className="rounded-2xl border p-6 sm:p-8">
                <h2 className="text-lg font-semibold">Skills & experience</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.skills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((skill, i) => (
                      <span
                        key={`${skill}-${i}`}
                        className="rounded-full bg-primary/5 px-4 py-2 text-sm text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                </div>
                <p className="mt-5 text-sm text-muted-foreground">
                  {profile.experience
                    ? `${profile.experience} of professional experience`
                    : "Add your skills and professional experience to help clients understand your strengths."}
                </p>
                {profile.website && /^https:\/\//.test(profile.website) && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    Visit portfolio <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </section>
            </>
          )}
          {message && (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          )}
          <section className="rounded-2xl bg-muted/50 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">
              Turn your expertise into a service
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Define what you deliver, set your price and create packages
              clients can book.
            </p>
            {user?.role === "seller" ? (
              <div className="mt-5 flex flex-wrap gap-4">
                <Link
                  href="/dashboard/seller/services/new"
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
                >
                  Create a service
                </Link>
                <Link
                  href="/dashboard/seller?tab=services"
                  className="px-2 py-3 text-sm font-medium text-primary"
                >
                  Manage my services →
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm">
                You can prepare your profile here. Publishing a service requires
                a seller account.{" "}
                <Link href="/support" className="text-primary underline">
                  Contact support about becoming a seller.
                </Link>
              </p>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
