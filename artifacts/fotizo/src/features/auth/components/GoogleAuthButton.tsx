import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GoogleAuthButtonProps {
  onLoggedIn: () => void;
  onNeedsRole: (pendingToken: string) => void;
}

// Renders nothing when no Client ID is configured (e.g. local dev before
// Google Cloud credentials exist) rather than crashing the auth pages.
export function GoogleAuthButton({ onLoggedIn, onNeedsRole }: GoogleAuthButtonProps) {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <GoogleLogin
        text="continue_with"
        width="320"
        onSuccess={async (credentialResponse) => {
          if (!credentialResponse.credential) return;
          const result = await loginWithGoogle(credentialResponse.credential);
          if (!result.success) {
            toast({
              variant: "destructive",
              title: "Google sign-in failed",
              description: result.error,
            });
            return;
          }
          if (result.needsRole) {
            onNeedsRole(result.pendingToken);
          } else {
            onLoggedIn();
          }
        }}
        onError={() => {
          toast({
            variant: "destructive",
            title: "Google sign-in failed",
            description: "Please try again.",
          });
        }}
      />
    </div>
  );
}
