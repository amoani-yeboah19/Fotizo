import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Package } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { WizardShell } from "@/components/common/Wizard";
import { Field, NativeSelect, ImageUrlInput, TagsInput } from "@/components/common/FormControls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Price } from "@/components/common/Price";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateProduct } from "@/features/marketplace/hooks";
import type { NewProductInput } from "@/types";

const PRODUCT_CATEGORIES = [
  "Electronics", "Fashion", "Home & Living", "Beauty", "Sports",
  "Books", "Digital Products", "Food & Gourmet", "Auto Parts",
];

const STEPS = ["Basics", "Pricing", "Media", "Review"];

const schema = z.object({
  title: z.string().min(3, "Give your product a clear title (min 3 characters)"),
  category: z.string().min(1, "Choose a category"),
  description: z.string().min(20, "Describe your product in at least 20 characters"),
  price: z.string().refine((v) => Number(v) > 0, "Enter a price greater than 0"),
  originalPrice: z.string().optional(),
  stockCount: z
    .string()
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Enter a whole number (0 or more)"),
});
type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["title", "category", "description"],
  1: ["price", "originalPrice", "stockCount"],
};

export default function PostProductPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const createProduct = useCreateProduct();

  const [step, setStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);
  const [mediaError, setMediaError] = useState<string>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "", description: "", price: "", originalPrice: "", stockCount: "1" },
  });
  const { register, formState: { errors }, watch } = form;

  const next = async () => {
    const fields = STEP_FIELDS[step];
    if (fields && !(await form.trigger(fields))) return;
    if (step === 2 && images.length === 0) {
      setMediaError("Add at least one image");
      return;
    }
    setMediaError(undefined);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = form.handleSubmit(async (data) => {
    if (images.length === 0) {
      setStep(2);
      setMediaError("Add at least one image");
      return;
    }
    const price = Number(data.price);
    const compareAt = Number(data.originalPrice);
    const input: NewProductInput = {
      title: data.title,
      category: data.category,
      description: data.description,
      price,
      originalPrice: data.originalPrice && compareAt > price ? compareAt : null,
      stockCount: Number(data.stockCount),
      images,
      tags,
      specs: Object.fromEntries(
        specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()]),
      ),
      seller: user?.name ?? "You",
      sellerId: user?.id ?? "me",
    };
    try {
      const created = await createProduct.mutateAsync(input);
      toast({ title: "Product published!", description: `${created.title} is now live on Fotizo.` });
      setLocation("/dashboard/seller");
    } catch {
      toast({ variant: "destructive", title: "Couldn't publish", description: "Please try again." });
    }
  });

  const setSpec = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const v = watch();

  return (
    <PageLayout mainClassName="container-app py-24 md:py-28">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Package className="w-3.5 h-3.5" aria-hidden="true" /> Seller tools
          </span>
          <h1 className="heading-page text-foreground mt-3">Post a product</h1>
          <p className="text-muted-foreground mt-1">List a new product on the Fotizo marketplace.</p>
        </header>

        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <WizardShell
            steps={STEPS}
            current={step}
            onBack={back}
            onNext={next}
            onSubmit={submit}
            submitting={createProduct.isPending}
            submitLabel="Publish product"
          >
            {step === 0 && (
              <>
                <Field label="Product title" htmlFor="title" required error={errors.title?.message}>
                  <Input id="title" placeholder="e.g. Sony WH-1000XM5 Headphones" {...register("title")} />
                </Field>
                <Field label="Category" htmlFor="category" required error={errors.category?.message}>
                  <NativeSelect id="category" options={PRODUCT_CATEGORIES} placeholder="Choose a category" {...register("category")} />
                </Field>
                <Field
                  label="Description"
                  htmlFor="description"
                  required
                  error={errors.description?.message}
                  hint="What is it, what's included, why it's great."
                >
                  <Textarea id="description" rows={5} placeholder="Describe your product…" {...register("description")} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Price (£)" htmlFor="price" required error={errors.price?.message}>
                    <Input id="price" type="number" min="0" step="0.01" placeholder="0.00" {...register("price")} />
                  </Field>
                  <Field
                    label="Compare-at price (£)"
                    htmlFor="originalPrice"
                    error={errors.originalPrice?.message}
                    hint="Optional — shown as a strikethrough if higher than the price."
                  >
                    <Input id="originalPrice" type="number" min="0" step="0.01" placeholder="0.00" {...register("originalPrice")} />
                  </Field>
                </div>
                <Field
                  label="Stock quantity"
                  htmlFor="stockCount"
                  required
                  error={errors.stockCount?.message}
                  hint="Set to 0 to mark as out of stock."
                >
                  <Input id="stockCount" type="number" min="0" step="1" className="max-w-40" {...register("stockCount")} />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Product images" required hint="Paste image URLs. The first is used as the cover.">
                  <ImageUrlInput value={images} onChange={setImages} error={mediaError} />
                </Field>
                <Field label="Tags" hint="Help buyers find it (e.g. wireless, noise-cancelling).">
                  <TagsInput value={tags} onChange={setTags} placeholder="Add a tag and press Enter" />
                </Field>
                <Field label="Specifications" hint="Optional key–value details (e.g. Brand → Sony).">
                  <div className="space-y-2">
                    {specs.map((s, i) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="Label" value={s.key} onChange={(e) => setSpec(i, { key: e.target.value })} />
                        <Input placeholder="Value" value={s.value} onChange={(e) => setSpec(i, { value: e.target.value })} />
                        <button
                          type="button"
                          onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove specification"
                          className="shrink-0 text-muted-foreground hover:text-destructive px-2"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" /> Add specification
                    </button>
                  </div>
                </Field>
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-foreground">Review your listing</h2>
                <div className="flex gap-4">
                  {images[0] && (
                    <img src={images[0]} alt="" className="h-24 w-24 rounded-lg border border-border object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{v.title || "Untitled product"}</p>
                    <p className="text-sm text-muted-foreground">{v.category || "No category"}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Price amount={Number(v.price) || 0} className="text-base font-bold text-primary" />
                      <span className="text-xs text-muted-foreground">· {Number(v.stockCount) || 0} in stock</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{v.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{images.length} image{images.length === 1 ? "" : "s"}</span>
                  {tags.length > 0 && <span>· {tags.length} tags</span>}
                  {specs.filter((s) => s.key.trim()).length > 0 && (
                    <span>· {specs.filter((s) => s.key.trim()).length} specs</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Publishing adds this to the marketplace and your seller dashboard.
                </p>
              </div>
            )}
          </WizardShell>
        </div>
      </div>
    </PageLayout>
  );
}
