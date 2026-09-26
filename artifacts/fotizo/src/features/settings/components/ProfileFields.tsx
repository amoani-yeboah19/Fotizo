import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileDraft } from "../profile";

export function ProfileFields({
  value,
  onChange,
  role,
  prefix = "profile",
}: {
  value: ProfileDraft;
  onChange: (value: ProfileDraft) => void;
  role: string;
  prefix?: string;
}) {
  const update = (key: keyof ProfileDraft, text: string) =>
    onChange({ ...value, [key]: text });
  const field = (
    key: keyof ProfileDraft,
    label: string,
    placeholder: string,
    maxLength: number,
    required = false,
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={`${prefix}-${key}`}>
        {label}
        {!required && " (optional)"}
      </label>
      <Input
        id={`${prefix}-${key}`}
        value={value[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        autoComplete={
          key === "country"
            ? "country-name"
            : key === "city"
              ? "address-level2"
              : key === "company"
                ? "organization"
                : "off"
        }
      />
    </div>
  );
  const select = (
    key: keyof ProfileDraft,
    label: string,
    options: string[],
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={`${prefix}-${key}`}>
        {label}
      </label>
      <select
        id={`${prefix}-${key}`}
        required
        value={value[key]}
        onChange={(e) => update(key, e.target.value)}
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("country", "Country of residence", "e.g. Ghana", 80, true)}
        {field("city", "City", "e.g. Accra", 100)}
      </div>
      {field(
        "language",
        "Preferred communication language",
        "e.g. English",
        80,
        true,
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Account type</legend>
        <div className="flex flex-wrap gap-5">
          {(["individual", "business"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${prefix}-account-type`}
                value={type}
                checked={value.accountType === type}
                onChange={() => update("accountType", type)}
                className="accent-primary"
              />
              {type === "individual"
                ? "Individual"
                : "Business or organisation"}
            </label>
          ))}
        </div>
      </fieldset>
      {value.accountType === "business" &&
        field(
          "company",
          "Business or organisation name",
          "Your trading name",
          120,
          true,
        )}
      {role === "buyer" &&
        select("purpose", "What will you use Fotizo for?", [
          "Shopping for myself",
          "Hiring professionals",
          "Buying for my business",
          "Shopping and hiring",
        ])}
      {role === "seller" && (
        <>
          <div className="border-t pt-5">
            <h3 className="font-semibold">Professional profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Help clients understand your expertise. Keep contact and payment
              details out of your public introduction.
            </p>
          </div>
          {field(
            "headline",
            "Professional headline",
            "e.g. Residential electrician and solar installer",
            80,
            true,
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`${prefix}-about`}>
              Professional introduction
            </label>
            <Textarea
              id={`${prefix}-about`}
              required
              minLength={80}
              maxLength={1200}
              rows={5}
              value={value.about}
              onChange={(e) => update("about", e.target.value)}
              placeholder="Describe your specialism, relevant experience and what clients can expect when working with you."
            />
            <p className="text-xs text-muted-foreground">
              80–1,200 characters · {value.about.length}/1,200
            </p>
          </div>
          {field(
            "skills",
            "Skills and specialisms",
            "e.g. Electrical installation, Solar systems",
            300,
            true,
          )}
          <p className="text-xs text-muted-foreground">
            Add up to 10 skills, separated by commas.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {select("experience", "Professional experience", [
              "Less than 1 year",
              "1–3 years",
              "3–5 years",
              "5–10 years",
              "10+ years",
            ])}
            {select("workMode", "Service delivery", [
              "On-site",
              "Remote",
              "On-site and remote",
              "Product sales",
            ])}
          </div>
          {field(
            "website",
            "Portfolio or professional website",
            "https://your-portfolio.com",
            300,
          )}
        </>
      )}
    </div>
  );
}
