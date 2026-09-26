import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ProfileFields } from "./ProfileFields";
import {
  emptyProfile,
  readProfileDraft,
  saveProfileDraft,
  clearProfileDraft,
  validateProfile,
} from "../profile";

export function ProfileDraftForm({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const [value, setValue] = useState(() => readProfileDraft(userId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const invalid = validateProfile(value, role);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!saveProfileDraft(userId, value)) {
      setError(
        "Your browser could not save this draft. Check your storage settings and try again.",
      );
      return;
    }
    setMessage(
      "Profile draft saved on this browser. It has not been published or synced to your account.",
    );
  }
  return (
    <section
      id="details"
      className="scroll-mt-28 rounded-2xl border bg-card p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold">
        {role === "seller" ? "Professional details" : "Personal preferences"}
      </h2>
      <p className="mt-2 mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Profile preview · These additional details are saved only on this
        browser while account syncing is being prepared. Do not enter sensitive
        information.
      </p>
      <form onSubmit={submit} className="space-y-6">
        <ProfileFields
          value={value}
          onChange={(next) => {
            setValue(next);
            setMessage("");
            setError("");
          }}
          role={role}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Save profile draft</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMessage("");
              setError("");
              if (!clearProfileDraft(userId)) {
                setError(
                  "Your browser could not remove this draft. Please try again.",
                );
                return;
              }
              setValue({ ...emptyProfile });
              setMessage(
                "Your profile draft has been removed from this browser.",
              );
            }}
          >
            Clear draft
          </Button>
        </div>
      </form>
    </section>
  );
}
