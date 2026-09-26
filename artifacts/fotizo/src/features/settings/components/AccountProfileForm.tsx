import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AUTH_USE_MOCKS, apiErrorMessage } from "@/api";
import { ProfileFields } from "./ProfileFields";
import { clearProfileDraft, emptyProfile, importableDraft, validateProfile, type ProfileDraft } from "../profile";
import { profileService, type StoredProfile } from "../profile.service";

/** Personal preferences and the professional profile, saved to the account. */
export function AccountProfileForm({ userId, role }: { userId: string; role: string }) {
  const query = useQuery({
    queryKey: ["account-profile", userId],
    queryFn: () => profileService.get(userId),
    staleTime: Infinity,
  });
  // Bumped by "Load latest version" to restart the editor from the server's copy.
  const [generation, setGeneration] = useState(0);
  const reload = async () => {
    await query.refetch();
    setGeneration((g) => g + 1);
  };
  return (
    <section id="details" className="scroll-mt-28 rounded-2xl border bg-card p-6 sm:p-8">
      <h2 className="text-xl font-semibold">{role === "seller" ? "Professional details" : "Personal preferences"}</h2>
      <p className="mt-2 mb-6 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        {AUTH_USE_MOCKS
          ? "Demo account · These details are saved only on this browser."
          : role === "seller"
            ? "Your location, language and business details are private. Your headline, introduction, skills, experience, service delivery and portfolio appear on your professional profile."
            : "These details are private to your account and help us tailor Fotizo to you."}
      </p>
      {query.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading your details…
        </p>
      ) : query.isError || !query.data ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(query.error, "We couldn't load your details.")}
          </p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!AUTH_USE_MOCKS && !query.data.profile && (
            <p role="status" className="mb-4 text-sm font-medium text-primary">
              Complete your profile so {role === "seller" ? "clients know what you offer" : "we can tailor Fotizo to you"}.
            </p>
          )}
          <ProfileEditor key={generation} userId={userId} role={role} stored={query.data} onReload={reload} />
          <PolicyRecord accepted={query.data.accepted ?? []} />
        </>
      )}
    </section>
  );
}

const POLICY_NAMES = { terms: "Terms of Service", privacy: "Privacy Policy" } as const;
const day = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/** The server's record of which policy versions this account accepted. */
function PolicyRecord({ accepted }: { accepted: StoredProfile["accepted"] & object }) {
  if (!accepted.length) return null;
  // Newest acceptance of each policy.
  const latest = (["terms", "privacy"] as const)
    .map((policy) => accepted.find((a) => a.policy === policy))
    .filter((a): a is NonNullable<typeof a> => !!a);
  return (
    <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
      {latest.map((a, i) => (
        <span key={a.policy}>
          {i > 0 && " "}
          You accepted the{" "}
          <a href={a.policy === "terms" ? "/terms" : "/privacy"} className="underline hover:text-primary">
            {POLICY_NAMES[a.policy]}
          </a>{" "}
          (version {a.version}) on {day(a.acceptedAt)}.
        </span>
      ))}
    </p>
  );
}

function ProfileEditor({
  userId,
  role,
  stored,
  onReload,
}: {
  userId: string;
  role: string;
  stored: StoredProfile;
  onReload: () => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<ProfileDraft>(() => stored.profile ?? { ...emptyProfile });
  const [version, setVersion] = useState(stored.version);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  // Details saved on this browser before accounts stored them can be imported once.
  const [draft, setDraft] = useState(() => (AUTH_USE_MOCKS || stored.profile ? null : importableDraft(userId, role)));

  const save = useMutation({
    mutationFn: (next: ProfileDraft) => profileService.save(userId, next, version),
    onSuccess: (saved) => {
      setVersion(saved.version);
      // Keep the policy record loaded with the profile.
      queryClient.setQueryData<StoredProfile>(["account-profile", userId], (old) => ({ ...old, ...saved }));
      if (!AUTH_USE_MOCKS) clearProfileDraft(userId);
      setDraft(null);
      setMessage(AUTH_USE_MOCKS ? "Details saved on this browser." : "Your details have been saved to your account.");
    },
    onError: (failure) => {
      const status = (failure as { status?: number }).status;
      setConflict(status === 409);
      setError(apiErrorMessage(failure, "We couldn't save your details. Please try again."));
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    setConflict(false);
    const invalid = validateProfile(value, role);
    if (invalid) {
      setError(invalid);
      return;
    }
    save.mutate(value);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>You have details saved on this browser from an earlier visit.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue(draft);
              setDraft(null);
              setMessage("Details added from this browser. Review them, then save to your account.");
            }}
          >
            Use saved details
          </Button>
        </div>
      )}
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
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save details"}
        </Button>
        {conflict && (
          <Button type="button" variant="outline" onClick={onReload}>
            Load latest version
          </Button>
        )}
      </div>
    </form>
  );
}
