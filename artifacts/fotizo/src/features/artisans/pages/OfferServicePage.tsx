import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { WizardShell } from "@/components/common/Wizard";
import { Field, NativeSelect, TagsInput, AvatarUploadInput } from "@/components/common/FormControls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Price } from "@/components/common/Price";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateService } from "@/features/artisans/hooks";
import type { NewServiceInput } from "@/types";

const SERVICE_CATEGORIES = [
  "Design & Creative", "Development & Tech", "Writing & Translation", "Marketing & Sales",
  "Home & Trades", "Consulting & Business", "Photography & Video", "Digital Products",
];
const EXPERIENCE = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];
const AVAILABILITY = ["Available now", "Within a few days", "Within a week", "Booking 2+ weeks out"];

const STEPS = ["Basics", "Expertise", "Packages", "Review"];

const schema = z.object({
  title: z.string().min(3, "Give your service a clear title (min 3 characters)"),
  category: z.string().min(1, "Choose a category"),
  description: z.string().min(20, "Describe your service in at least 20 characters"),
  experience: z.string().min(1, "Select your experience level"),
  hourlyRate: z.string().refine((v) => Number(v) > 0, "Enter an hourly rate greater than 0"),
  availability: z.string().min(1, "Select your availability"),
});
type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["title", "category", "description", "experience"],
  1: ["hourlyRate", "availability"],
};

type PackageDraft = { name: string; price: string; delivery: string; description: string };
const emptyPackage: PackageDraft = { name: "", price: "", delivery: "", description: "" };

export default function OfferServicePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const createService = useCreateService();

  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [packages, setPackages] = useState<PackageDraft[]>([{ ...emptyPackage }]);
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [stepError, setStepError] = useState<string>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", description: "", experience: "", hourlyRate: "", availability: "" },
  });
  const { register, formState: { errors }, watch } = form;

  const validPackages = packages.filter((p) => p.name.trim() && Number(p.price) > 0);

  const next = async () => {
    const fields = STEP_FIELDS[step];
    if (fields && !(await form.trigger(fields))) return;
    if (step === 1 && skills.length === 0) {
      setStepError("Add at least one skill");
      return;
    }
    if (step === 2 && validPackages.length === 0) {
      setStepError("Add at least one package with a name and price");
      return;
    }
    setStepError(undefined);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setStepError(undefined);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = form.handleSubmit(async (data) => {
    if (skills.length === 0) return setStep(1), setStepError("Add at least one skill");
    if (validPackages.length === 0) return setStep(2), setStepError("Add at least one package");
    if (!avatar.trim()) return setStepError("Add a profile photo");

    const input: NewServiceInput = {
      title: data.title,
      category: data.category,
      description: data.description,
      experience: data.experience,
      hourlyRate: Number(data.hourlyRate),
      availability: data.availability,
      skills,
      avatar: avatar.trim(),
      packages: validPackages.map((p) => ({
        name: p.name.trim(),
        price: Number(p.price),
        delivery: p.delivery.trim() || "Flexible",
        description: p.description.trim(),
      })),
      provider: user?.name ?? "You",
      providerId: user?.id ?? "me",
    };
    try {
      const created = await createService.mutateAsync(input);
      toast({ title: "Service published!", description: `${created.title} is now live on Fotizo.` });
      setLocation("/dashboard/seller");
    } catch {
      toast({ variant: "destructive", title: "Couldn't publish", description: "Please try again." });
    }
  });

  const setPackage = (i: number, patch: Partial<PackageDraft>) =>
    setPackages((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const v = watch();

  return (
    <PageLayout mainClassName="container-app py-24 md:py-28">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FF6A00]/10 px-3 py-1 text-xs font-semibold text-[#FF6A00]">
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> For professionals
          </span>
          <h1 className="heading-page text-foreground mt-3">Offer a service</h1>
          <p className="text-muted-foreground mt-1">
            Create a profile buyers can hire — artisans, freelancers and businesses welcome.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <WizardShell
            steps={STEPS}
            current={step}
            onBack={back}
            onNext={next}
            onSubmit={submit}
            submitting={createService.isPending}
            submitLabel="Publish service"
          >
            {step === 0 && (
              <>
                <Field label="Service title" htmlFor="title" required error={errors.title?.message}>
                  <Input id="title" placeholder="e.g. Brand identity & logo design" {...register("title")} />
                </Field>
                <Field label="Category" htmlFor="category" required error={errors.category?.message}>
                  <NativeSelect id="category" options={SERVICE_CATEGORIES} placeholder="Choose a category" {...register("category")} />
                </Field>
                <Field label="Experience" htmlFor="experience" required error={errors.experience?.message}>
                  <NativeSelect id="experience" options={EXPERIENCE} placeholder="How long have you been doing this?" {...register("experience")} />
                </Field>
                <Field
                  label="About this service"
                  htmlFor="description"
                  required
                  error={errors.description?.message}
                  hint="What you offer, your process, what clients can expect."
                >
                  <Textarea id="description" rows={5} placeholder="Describe your service…" {...register("description")} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Hourly rate (£)" htmlFor="hourlyRate" required error={errors.hourlyRate?.message}>
                    <Input id="hourlyRate" type="number" min="0" step="1" placeholder="0" {...register("hourlyRate")} />
                  </Field>
                  <Field label="Availability" htmlFor="availability" required error={errors.availability?.message}>
                    <NativeSelect id="availability" options={AVAILABILITY} placeholder="Select availability" {...register("availability")} />
                  </Field>
                </div>
                <Field label="Skills" required hint="The tools and specialities you're known for." error={step === 1 ? stepError : undefined}>
                  <TagsInput value={skills} onChange={setSkills} placeholder="e.g. Figma, Branding — press Enter" />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Packages" required hint="Offer 1–3 tiers clients can book (e.g. Basic, Standard, Premium)." error={step === 2 ? stepError : undefined}>
                  <div className="space-y-4">
                    {packages.map((p, i) => (
                      <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Package {i + 1}</span>
                          {packages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setPackages((prev) => prev.filter((_, idx) => idx !== i))}
                              aria-label={`Remove package ${i + 1}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input placeholder="Name (e.g. Basic)" value={p.name} onChange={(e) => setPackage(i, { name: e.target.value })} />
                          <Input type="number" min="0" step="1" placeholder="Price (£)" value={p.price} onChange={(e) => setPackage(i, { price: e.target.value })} />
                          <Input placeholder="Delivery (e.g. 3 days)" value={p.delivery} onChange={(e) => setPackage(i, { delivery: e.target.value })} />
                        </div>
                        <Textarea rows={2} placeholder="What's included in this package?" value={p.description} onChange={(e) => setPackage(i, { description: e.target.value })} />
                      </div>
                    ))}
                    {packages.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setPackages((prev) => [...prev, { ...emptyPackage }])}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" /> Add package
                      </button>
                    )}
                  </div>
                </Field>
              </>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <Field label="Profile photo" required hint="A clear headshot or your business logo." error={step === 3 ? stepError : undefined}>
                  <AvatarUploadInput value={avatar} onChange={setAvatar} />
                </Field>

                <div className="rounded-xl border border-border p-4">
                  <h2 className="text-sm font-bold text-foreground mb-2">Review</h2>
                  <p className="font-semibold text-foreground">{v.title || "Untitled service"}</p>
                  <p className="text-sm text-muted-foreground">
                    {v.category || "No category"} · {v.experience || "—"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Price amount={Number(v.hourlyRate) || 0} className="font-bold text-primary" />
                    <span className="text-muted-foreground">/hr · {v.availability || "—"}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {skills.length} skill{skills.length === 1 ? "" : "s"} · {validPackages.length} package
                    {validPackages.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            )}
          </WizardShell>
        </div>
      </div>
    </PageLayout>
  );
}
