import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_USE_MOCKS } from "@/api";
import { PageLayout } from "@/components/layout/PageLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
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
  const disabled = pending || AUTH_USE_MOCKS;

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
        "Use at least 8 characters and at most 72 UTF-8 bytes. Some characters use more than one byte.",
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
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">Account settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your display name and password.
          </p>
        </header>
        {AUTH_USE_MOCKS && (
          <p role="status">Account changes are unavailable in this demo.</p>
        )}
        <form
          onSubmit={saveProfile}
          aria-labelledby="profile-heading"
          className="space-y-4 rounded-xl border border-border p-6"
        >
          <h2 id="profile-heading" className="text-xl font-semibold">
            Profile
          </h2>
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
          <p className="text-sm">Email: {user?.email}</p>
          <p className="text-sm text-muted-foreground">
            Email changes are not available yet.
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
        <section
          aria-labelledby="password-heading"
          className="space-y-4 rounded-xl border border-border p-6"
        >
          <h2 id="password-heading" className="text-xl font-semibold">
            Password
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
                  onChange={(event) => setCurrentPassword(event.target.value)}
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
                <label htmlFor="confirm-password">Confirm new password</label>
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
      </div>
    </PageLayout>
  );
}
