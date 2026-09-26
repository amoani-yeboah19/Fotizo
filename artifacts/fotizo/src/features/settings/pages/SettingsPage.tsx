import {
  UserRound,
  LockKeyhole,
  SlidersHorizontal,
  BriefcaseBusiness,
  ArrowUpRight,
} from "lucide-react";
import { AccountProfileForm } from "../components/AccountProfileForm";
import { DisplayPreferences } from "../components/DisplayPreferences";
import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_USE_MOCKS } from "@/api";
import { PageLayout } from "@/components/layout/PageLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarUploadInput } from "@/components/common/FormControls";

export default function SettingsPage() {
  const { user, updateProfile, updateAvatar, changePassword } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const disabled = pending || AUTH_USE_MOCKS;

  // The photo is uploaded by the picker; saving it to the account happens at once.
  async function saveAvatar(url: string) {
    setAvatarMessage("");
    setAvatarError("");
    const result = await updateAvatar(url || null);
    if (!result.success) {
      setAvatarError(result.error ?? "Your profile photo could not be saved.");
      return;
    }
    setAvatarMessage(url ? "Your profile photo has been updated." : "Your profile photo has been removed.");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setProfileMessage("");
    setProfileError("");
    if (!name.trim() || name.trim().length > 120) {
      setProfileError("Enter a name between 1 and 120 characters.");
      return;
    }
    setPending(true);
    const result = await updateProfile(name.trim());
    setPending(false);
    if (!result.success) {
      setProfileError(result.error ?? "Profile could not be saved.");
      return;
    }
    void queryClient.invalidateQueries();
    setProfileMessage("Your display name has been saved.");
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setPasswordError("");
    if (newPassword !== confirmation) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (
      newPassword.length < 8 ||
      new TextEncoder().encode(newPassword).length > 72
    ) {
      setPasswordError(
        "Use at least 8 characters. This password is too long if it contains many accented characters or symbols; try a shorter passphrase.",
      );
      return;
    }
    setPending(true);
    const result = await changePassword(currentPassword, newPassword);
    setPending(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    if (!result.success) {
      setPasswordError(result.error ?? "Password could not be changed.");
      return;
    }
    navigate("/login");
  }

  return (
    <PageLayout mainClassName="container-app py-24 md:py-28">
      <div className="mx-auto max-w-6xl">
        <header>
          <h1 className="text-3xl font-bold">Account settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your profile, protect your account and personalise your
            experience.
          </p>
        </header>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 space-y-5">
            <div className="rounded-2xl border bg-card p-5">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="mb-3 h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {user?.name?.charAt(0).toUpperCase() || "F"}
                </div>
              )}
              <p className="font-semibold break-words">{user?.name}</p>
              <p className="mt-1 text-xs text-muted-foreground capitalize">
                {user?.role?.replaceAll("_", " ")} account
              </p>
            </div>
            <nav
              aria-label="Settings sections"
              className="flex flex-wrap gap-1 lg:flex-col"
            >
              {[
                { id: "account", label: "Account", icon: UserRound },
                {
                  id: "details",
                  label:
                    user?.role === "seller"
                      ? "Professional details"
                      : "Personal preferences",
                  icon: BriefcaseBusiness,
                },
                {
                  id: "security",
                  label: "Password & security",
                  icon: LockKeyhole,
                },
                {
                  id: "preferences",
                  label: "Display preferences",
                  icon: SlidersHorizontal,
                },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-primary"
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </a>
              ))}
            </nav>
            <a
              href="/support"
              className="flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-primary"
            >
              Need account help?{" "}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </aside>
          <div className="space-y-6 min-w-0">
            {AUTH_USE_MOCKS && (
              <p role="status">
                Demo account · Display name and password changes are
                unavailable. You can try the additional profile fields below.
              </p>
            )}
            <form
              onSubmit={saveProfile}
              id="account"
              aria-labelledby="profile-heading"
              className="scroll-mt-28 space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
            >
              <h2 id="profile-heading" className="text-xl font-semibold">
                Account information
              </h2>
              {!AUTH_USE_MOCKS && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Profile photo</p>
                  <AvatarUploadInput value={user?.avatar ?? ""} purpose="avatar" onChange={saveAvatar} />
                  {avatarError && (
                    <p role="alert" className="text-sm text-destructive">
                      {avatarError}
                    </p>
                  )}
                  {avatarMessage && (
                    <p role="status" className="text-sm text-primary">
                      {avatarMessage}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="account-name">Display name</label>
                <Input
                  id="account-name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setProfileMessage("");
                  }}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="account-email" className="text-sm font-medium">
                  Email address
                </label>
                <Input
                  id="account-email"
                  value={user?.email ?? ""}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Your email is private and used for signing in. Contact support
                if you need help updating it.
              </p>
              {profileError && (
                <p role="alert" className="text-destructive">
                  {profileError}
                </p>
              )}
              {profileMessage && <p role="status">{profileMessage}</p>}
              <Button type="submit" disabled={disabled}>
                Save profile
              </Button>
            </form>
            {user?.id && (
              <AccountProfileForm
                key={user.id}
                userId={user.id}
                role={user.role}
              />
            )}
            <section
              id="security"
              aria-labelledby="password-heading"
              className="scroll-mt-28 space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
            >
              <h2 id="password-heading" className="text-xl font-semibold">
                Password & security
              </h2>
              {user?.hasPassword === true && !AUTH_USE_MOCKS ? (
                <form onSubmit={savePassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Changing your password signs you out on all devices. Sign in
                    again with your new password.
                  </p>
                  <div>
                    <label htmlFor="current-password">Current password</label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password">New password</label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password">
                      Confirm new password
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      disabled={disabled}
                    />
                  </div>
                  {passwordError && (
                    <p role="alert" className="text-destructive">
                      {passwordError}
                    </p>
                  )}
                  <Button type="submit" disabled={disabled}>
                    Change password and sign out
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {user?.hasPassword === false
                    ? "You use Google to sign in. Manage your password in your Google account."
                    : "Password changes are unavailable in this session."}
                </p>
              )}
            </section>
            <DisplayPreferences />
            <section className="rounded-2xl border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold">
                Privacy & account support
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                For account closure, personal data requests or sign-in
                assistance, contact our support team. Requests are reviewed
                before any account changes are made.
              </p>
              <div className="mt-4 flex flex-wrap gap-5 text-sm font-medium text-primary">
                <a href="/support" className="underline underline-offset-4">
                  Contact support
                </a>
                <a href="/privacy" className="underline underline-offset-4">
                  Privacy policy
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
