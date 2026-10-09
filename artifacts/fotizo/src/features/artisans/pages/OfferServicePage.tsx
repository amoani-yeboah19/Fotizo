import { useQuery } from "@tanstack/react-query";
import { currencyService } from "@/services/currency.service";
import { servicePrice, validUsdRate } from "../lib/service-pricing";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Briefcase, Plus, Trash2, Save, Eye } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { WizardShell } from "@/components/common/Wizard";
import {
  Field,
  NativeSelect,
  GroupedNativeSelect,
  TagsInput,
  AvatarUploadInput,
  ImageUploadInput,
} from "@/components/common/FormControls";
import {
  groupedServiceCategories,
  isServiceCategoryId,
  serviceCategoryLabel,
} from "@workspace/service-taxonomy";
import { AiAssistButton } from "@/components/common/AiAssistButton";
import { aiService } from "@/services";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateService, useMyService, useUpdateService } from "../hooks";
import { Loading } from "@/components/common/QueryStates";
import { apiErrorMessage } from "@/api";
import type { NewServiceInput, ServiceDetails } from "@/types";
import { ServiceOfferPreview } from "../components/ServiceOfferPreview";

const GROUPS = groupedServiceCategories().map(({ group, categories }) => ({
  label: group.label,
  options: categories.map((c) => ({ value: c.id, label: c.label })),
}));
const STEPS = [
  "Overview",
  "Pricing",
  "Description & FAQ",
  "Requirements",
  "Gallery",
  "Preview & publish",
];
const TIERS = ["Basic", "Standard", "Premium"];
type PackageDraft = {
  name: string;
  price: string;
  delivery: string;
  description: string;
  revisions: string;
  features: string[];
};
const newPackage = (name: string): PackageDraft => ({
  name,
  price: "",
  delivery: "",
  description: "",
  revisions: "0",
  features: [],
});
const EMPTY = {
  title: "",
  category: "",
  experience: "",
  hourlyRate: "",
  availability: "",
  description: "",
};

export default function OfferServicePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, params] = useRoute("/dashboard/seller/services/:id/edit");
  const editingId = editing ? params?.id : undefined;
  const existing = useMyService(editingId);
  const exchange = useQuery({
    queryKey: ["service-editor-rates"],
    queryFn: currencyService.getRates,
    staleTime: Infinity,
    retry: 1,
  });
  const usdRate =
    exchange.data?.GBP === 1 && validUsdRate(exchange.data?.USD)
      ? exchange.data.USD
      : undefined;
  const toBase = (amount: string) =>
    usdRate ? servicePrice(Number(amount), usdRate, "to-base") : 0;
  const create = useCreateService();
  const update = useUpdateService();
  const [loadedId, setLoadedId] = useState<string>();
  const [step, setStep] = useState(0);
  const [v, setV] = useState(EMPTY);
  const [skills, setSkills] = useState<string[]>([]);
  const [packages, setPackages] = useState<PackageDraft[]>([
    newPackage("Basic"),
  ]);
  const [details, setDetails] = useState<ServiceDetails>({
    faqs: [],
    requirements: [],
    gallery: [],
  });
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const uploading = avatarUploading || galleryUploading;
  const [draftAvailable, setDraftAvailable] = useState(false);
  const draftKey = `fotizo.service-draft.v2:${user?.id ?? "guest"}:${editingId ?? "new"}`;
  useEffect(() => {
    try {
      setDraftAvailable(!!localStorage.getItem(draftKey));
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    const s = existing.data;
    if (!s || s.id === loadedId || !usdRate) return;
    setV({
      title: s.title,
      category: s.category,
      experience: s.experience,
      hourlyRate: String(servicePrice(s.hourlyRate, usdRate, "to-usd")),
      availability: s.availability,
      description: s.description,
    });
    setSkills(s.skills);
    setAvatar(s.avatar);
    setDetails(s.details ?? { faqs: [], requirements: [], gallery: [] });
    setPackages(
      s.packages.map((p) => ({
        ...p,
        price: String(servicePrice(p.price, usdRate, "to-usd")),
        revisions: String(p.revisions ?? 0),
        features: p.features ?? [],
      })),
    );
    setLoadedId(s.id);
  }, [existing.data, loadedId, usdRate]);
  const set = (key: keyof typeof EMPTY, value: string) =>
    setV((prev) => ({ ...prev, [key]: value }));
  const changePackage = (i: number, patch: Partial<PackageDraft>) =>
    setPackages((prev) =>
      prev.map((p, n) => (n === i ? { ...p, ...patch } : p)),
    );
  const validation = (s: number) => {
    if (s === 1 && !usdRate)
      return "Dollar pricing is temporarily unavailable. Please retry loading exchange rates before continuing.";
    if (
      s === 0 &&
      (v.title.trim().length < 3 ||
        !isServiceCategoryId(v.category) ||
        !v.experience ||
        !v.availability ||
        !skills.length)
    )
      return "Add a service title, category, experience, availability and at least one skill.";
    if (
      s === 1 &&
      (!Number.isFinite(Number(v.hourlyRate)) || Number(v.hourlyRate) <= 0)
    )
      return "Enter an hourly rate greater than zero. Package prices are fixed totals, separate from your hourly rate.";
    if (
      s === 1 &&
      (!packages.length ||
        packages.some(
          (p) =>
            !p.name.trim() ||
            !Number.isFinite(Number(p.price)) ||
            Number(p.price) <= 0 ||
            !p.delivery.trim() ||
            !p.description.trim() ||
            !/^\d+$/.test(p.revisions) ||
            Number(p.revisions) > 100,
        ))
    )
      return "Complete every package: name, price, delivery time, scope and revisions (0–100).";
    if (
      s === 1 &&
      new Set(packages.map((p) => p.name.trim().toLowerCase())).size !==
        packages.length
    )
      return "Give each package a different name so buyers can identify it.";
    if (
      s === 2 &&
      (v.description.trim().length < 20 ||
        details.faqs.some((f) => !f.question.trim() || !f.answer.trim()))
    )
      return "Write at least 20 characters about your service and complete or remove unfinished FAQs.";
    if (s === 3 && details.requirements.some((r) => !r.trim()))
      return "Complete or remove empty buyer requirements.";
    if (s === 4 && (!avatar || uploading))
      return uploading
        ? "Wait for your photos to finish uploading."
        : "Add a profile photo or business logo.";
    return "";
  };
  const writeWithAi = async () => {
    const draft = await aiService.writeServiceListing({
      title: v.title,
      category: serviceCategoryLabel(v.category),
      notes: v.description,
    });
    set("description", draft.description);
    if (draft.skills.length) setSkills(draft.skills.slice(0, 20));
  };
  const next = () => {
    const message = validation(step);
    setError(message);
    if (!message) setStep((s) => s + 1);
  };
  const saveDraft = () => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          v,
          skills,
          packages,
          details,
          avatar,
          currency: "USD",
        }),
      );
      setDraftAvailable(true);
      toast({ title: "Draft saved on this device" });
    } catch {
      toast({
        title: "Couldn't save draft",
        description: "Your browser storage may be full or unavailable.",
        variant: "destructive",
      });
    }
  };
  const restoreDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (
        !d ||
        !d.v ||
        !Array.isArray(d.packages) ||
        !Array.isArray(d.skills) ||
        !Array.isArray(d.details?.gallery) ||
        !Array.isArray(d.details?.faqs) ||
        !Array.isArray(d.details?.requirements)
      )
        throw Error();
      if (d.currency !== "USD") {
        if (!usdRate)
          throw Error(
            "Exchange rates are required to restore a previous GBP draft.",
          );
        d.v.hourlyRate = d.v.hourlyRate
          ? String(servicePrice(Number(d.v.hourlyRate), usdRate, "to-usd"))
          : "";
        d.packages = d.packages.map((p: PackageDraft) => ({
          ...p,
          price: p.price
            ? String(servicePrice(Number(p.price), usdRate, "to-usd"))
            : "",
        }));
      }
      setV({ ...EMPTY, ...d.v });
      setSkills(d.skills);
      setPackages(d.packages);
      setDetails(d.details);
      setAvatar(d.avatar ?? "");
      setStep(0);
      setError("");
    } catch {
      toast({ title: "Couldn't restore this draft", variant: "destructive" });
    }
  };
  const input: NewServiceInput = {
    ...v,
    title: v.title.trim(),
    description: v.description.trim(),
    hourlyRate: toBase(v.hourlyRate),
    skills,
    avatar,
    details,
    provider: user?.name ?? "You",
    providerId: user?.id ?? "",
    packages: packages.map((p) => ({
      ...p,
      price: toBase(p.price),
      revisions: Number(p.revisions),
      name: p.name.trim(),
      delivery: /^\d+$/.test(p.delivery.trim())
        ? `${p.delivery.trim()} days`
        : p.delivery.trim(),
      description: p.description.trim(),
    })),
  };
  const publish = async () => {
    for (let i = 0; i < 5; i++) {
      const message = validation(i);
      if (message) {
        setStep(i);
        setError(message);
        return;
      }
    }
    try {
      if (editingId) await update.mutateAsync({ id: editingId, input });
      else await create.mutateAsync(input);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      toast({
        title: editingId ? "Service updated" : "Service submitted",
        description:
          "Your listing has been saved. Check its status in My Services.",
      });
      navigate("/dashboard/seller?tab=services");
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "We couldn't save your service. Your entries are still here; please try again.",
        ),
      );
    }
  };
  if (editingId && !usdRate && !exchange.isLoading)
    return (
      <PageLayout>
        <p role="alert">Dollar pricing could not be loaded.</p>
        <Button onClick={() => exchange.refetch()}>Retry exchange rates</Button>
      </PageLayout>
    );
  if (
    editingId &&
    (existing.isLoading || (existing.data && loadedId !== existing.data.id))
  )
    return (
      <PageLayout>
        <Loading label="Loading your service…" />
      </PageLayout>
    );
  if (
    editingId &&
    (existing.isError || (!existing.isLoading && !existing.data))
  )
    return (
      <PageLayout>
        <p role="alert">This service could not be loaded.</p>
      </PageLayout>
    );
  return (
    <PageLayout mainClassName="container-app py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent flex items-center gap-2">
              <Briefcase size={16} /> MADE FOR YOUR EXPERTISE
            </p>
            <h1 className="heading-page mt-2">
              {editingId
                ? "Edit your service"
                : "Turn your skills into a service"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Set a clear scope, build your packages and see what buyers will
              see.
            </p>
          </div>
          <div className="flex gap-2">
            {draftAvailable && (
              <Button variant="outline" onClick={restoreDraft}>
                Restore draft
              </Button>
            )}
            <Button variant="outline" onClick={saveDraft} disabled={uploading}>
              <Save size={16} className="mr-2" />
              Save draft
            </Button>
          </div>
        </header>
        <div className="rounded-2xl border bg-white p-4 sm:p-8 shadow-sm">
          <WizardShell
            steps={STEPS}
            current={step}
            onBack={() => {
              setStep((s) => s - 1);
              setError("");
            }}
            onNext={next}
            onSubmit={publish}
            submitting={create.isPending || update.isPending || uploading}
            submitLabel={editingId ? "Save changes" : "Publish service"}
          >
            <h2 className="text-xl font-bold">{STEPS[step]}</h2>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {!usdRate && (
              <div role="status" className="rounded-lg bg-muted p-3 text-sm">
                {exchange.isLoading
                  ? "Loading dollar pricing…"
                  : "Dollar pricing could not be loaded."}{" "}
                {!exchange.isLoading && (
                  <Button variant="outline" onClick={() => exchange.refetch()}>
                    Retry exchange rates
                  </Button>
                )}
              </div>
            )}
            {step === 0 && (
              <div className="max-w-3xl space-y-5">
                <Field
                  label="Service title"
                  htmlFor="title"
                  required
                  hint="Tell buyers exactly what you will do."
                >
                  <Input
                    id="title"
                    maxLength={200}
                    value={v.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="I will design and build your business website"
                  />
                </Field>
                <Field label="Category" htmlFor="category" required>
                  <GroupedNativeSelect
                    id="category"
                    groups={GROUPS}
                    value={v.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Experience" htmlFor="experience" required>
                    <NativeSelect
                      id="experience"
                      options={[
                        "Less than 1 year",
                        "1–3 years",
                        "3–5 years",
                        "5–10 years",
                        "10+ years",
                      ]}
                      value={v.experience}
                      onChange={(e) => set("experience", e.target.value)}
                    />
                  </Field>
                  <Field label="Availability" htmlFor="availability" required>
                    <NativeSelect
                      id="availability"
                      options={[
                        "Available now",
                        "Within a few days",
                        "Within a week",
                        "Booking 2+ weeks out",
                      ]}
                      value={v.availability}
                      onChange={(e) => set("availability", e.target.value)}
                    />
                  </Field>
                </div>
                <Field
                  label="Skills"
                  required
                  hint="Add skills buyers can search for."
                >
                  <TagsInput
                    value={skills}
                    onChange={(next) => setSkills(next.slice(0, 20))}
                  />
                </Field>
              </div>
            )}
            {step === 1 && (
              <>
                <Field
                  label="Hourly rate ($ USD)"
                  htmlFor="hourly-rate"
                  required
                  hint="For hourly bookings. Each package below has its own fixed total price."
                >
                  <Input
                    className="max-w-xs"
                    id="hourly-rate"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={v.hourlyRate}
                    onChange={(e) => set("hourlyRate", e.target.value)}
                  />
                </Field>
                <p className="text-sm text-muted-foreground">
                  Offer one package or up to three tiers. Prices are entered in
                  US dollars; buyers see their selected currency.
                </p>
                <div className="grid items-start gap-4 lg:grid-cols-3">
                  {packages.map((p, i) => (
                    <section
                      key={i}
                      aria-label={`${TIERS[i]} package`}
                      className="rounded-xl border overflow-hidden"
                    >
                      <div className="flex justify-between items-center bg-primary/5 px-4 py-3">
                        <h3 className="font-bold">{TIERS[i]}</h3>
                        {packages.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove ${TIERS[i]} package`}
                            onClick={() =>
                              setPackages((prev) =>
                                prev.filter((_, n) => n !== i),
                              )
                            }
                            className="p-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="p-4 space-y-4">
                        <Field
                          label="Package name"
                          htmlFor={`name-${i}`}
                          required
                        >
                          <Input
                            id={`name-${i}`}
                            maxLength={80}
                            value={p.name}
                            onChange={(e) =>
                              changePackage(i, { name: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="What's included"
                          htmlFor={`scope-${i}`}
                          required
                        >
                          <Textarea
                            id={`scope-${i}`}
                            maxLength={2000}
                            rows={4}
                            value={p.description}
                            placeholder="Describe the scope and deliverables for this package."
                            onChange={(e) =>
                              changePackage(i, { description: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="Delivery / contract duration"
                          htmlFor={`delivery-${i}`}
                          required
                          hint="e.g. 3 working days or a 5-day contract"
                        >
                          <Input
                            id={`delivery-${i}`}
                            maxLength={80}
                            value={p.delivery}
                            onChange={(e) =>
                              changePackage(i, { delivery: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="Included revisions"
                          htmlFor={`revisions-${i}`}
                          required
                        >
                          <Input
                            id={`revisions-${i}`}
                            type="number"
                            min="0"
                            max="100"
                            value={p.revisions}
                            onChange={(e) =>
                              changePackage(i, { revisions: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="Deliverable checklist"
                          hint="One feature per entry. Press Enter to add."
                        >
                          <TagsInput
                            value={p.features}
                            onChange={(features) =>
                              changePackage(i, {
                                features: features.slice(0, 20),
                              })
                            }
                            placeholder="e.g. 5 responsive pages"
                          />
                        </Field>
                        <Field
                          label="Total package price ($ USD)"
                          htmlFor={`price-${i}`}
                          required
                        >
                          <Input
                            id={`price-${i}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={p.price}
                            onChange={(e) =>
                              changePackage(i, { price: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                    </section>
                  ))}
                </div>
                {packages.length < 3 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPackages((prev) => [
                        ...prev,
                        newPackage(TIERS[prev.length]),
                      ])
                    }
                  >
                    <Plus size={16} className="mr-2" />
                    Add {TIERS[packages.length]} package
                  </Button>
                )}
              </>
            )}
            {step === 2 && (
              <div className="space-y-5 max-w-3xl">
                <div className="flex justify-end">
                  <AiAssistButton
                    disabled={v.title.length < 3 || !v.category}
                    run={writeWithAi}
                  />
                </div>
                <Field
                  label="About your service"
                  htmlFor="description"
                  required
                  hint="Explain your process, deliverables and exclusions."
                >
                  <Textarea
                    id="description"
                    rows={7}
                    maxLength={5000}
                    value={v.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
                <h3 className="font-bold">Frequently asked questions</h3>
                {details.faqs.map((faq, i) => (
                  <div key={i} className="rounded-xl border p-4 space-y-3">
                    <Field
                      label={`Question ${i + 1}`}
                      htmlFor={`question-${i}`}
                    >
                      <Input
                        id={`question-${i}`}
                        value={faq.question}
                        maxLength={300}
                        onChange={(e) =>
                          setDetails((d) => ({
                            ...d,
                            faqs: d.faqs.map((f, n) =>
                              n === i ? { ...f, question: e.target.value } : f,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Answer" htmlFor={`answer-${i}`}>
                      <Textarea
                        id={`answer-${i}`}
                        value={faq.answer}
                        maxLength={2000}
                        onChange={(e) =>
                          setDetails((d) => ({
                            ...d,
                            faqs: d.faqs.map((f, n) =>
                              n === i ? { ...f, answer: e.target.value } : f,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDetails((d) => ({
                          ...d,
                          faqs: d.faqs.filter((_, n) => n !== i),
                        }))
                      }
                    >
                      Remove question
                    </Button>
                  </div>
                ))}
                {details.faqs.length < 10 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDetails((d) => ({
                        ...d,
                        faqs: [...d.faqs, { question: "", answer: "" }],
                      }))
                    }
                  >
                    <Plus size={16} className="mr-2" />
                    Add FAQ
                  </Button>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 max-w-3xl">
                <p className="text-muted-foreground">
                  Tell buyers what you need before work starts: a brief,
                  measurements, reference images or access arrangements. Do not
                  ask for passwords or payment details.
                </p>
                {details.requirements.map((r, i) => (
                  <Field
                    key={i}
                    label={`Buyer requirement ${i + 1}`}
                    htmlFor={`requirement-${i}`}
                  >
                    <div className="flex items-start gap-2">
                      <Textarea
                        id={`requirement-${i}`}
                        maxLength={1000}
                        value={r}
                        onChange={(e) =>
                          setDetails((d) => ({
                            ...d,
                            requirements: d.requirements.map((x, n) =>
                              n === i ? e.target.value : x,
                            ),
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        aria-label={`Remove requirement ${i + 1}`}
                        onClick={() =>
                          setDetails((d) => ({
                            ...d,
                            requirements: d.requirements.filter(
                              (_, n) => n !== i,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Field>
                ))}
                {details.requirements.length < 20 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDetails((d) => ({
                        ...d,
                        requirements: [...d.requirements, ""],
                      }))
                    }
                  >
                    <Plus size={16} className="mr-2" />
                    Add requirement
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional. These instructions appear on your service page.
                </p>
              </div>
            )}
            {step === 4 && (
              <div className="max-w-3xl space-y-6">
                <Field label="Profile photo or business logo" required>
                  <AvatarUploadInput
                    value={avatar}
                    onChange={setAvatar}
                    onBusyChange={setAvatarUploading}
                  />
                </Field>
                <Field
                  label="Showcase your work"
                  hint="Add up to six photos. Your first image is the gallery cover. Use work you own or have permission to share."
                >
                  <ImageUploadInput
                    purpose="service"
                    value={details.gallery}
                    onChange={(gallery) =>
                      setDetails((d) => ({ ...d, gallery }))
                    }
                    maxFiles={6}
                    onBusyChange={setGalleryUploading}
                  />
                </Field>
              </div>
            )}
            {step === 5 && (
              <>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye size={16} />
                  Buyer preview — review your details before publishing.
                </p>
                <ServiceOfferPreview
                  title={v.title}
                  description={v.description}
                  provider={user?.name ?? "You"}
                  avatar={avatar}
                  category={serviceCategoryLabel(v.category)}
                  packages={input.packages.map((p, i) => ({
                    ...p,
                    price: Number(packages[i].price),
                  }))}
                  priceCurrency="USD"
                  details={details}
                />
              </>
            )}
          </WizardShell>
        </div>
      </div>
    </PageLayout>
  );
}
