import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GoogleAuthButton } from "@/features/auth/components/GoogleAuthButton";
import { GoogleRolePickerDialog } from "@/features/auth/components/GoogleRolePickerDialog";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await login(data.email, data.password);
      if (res.success) {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        // Every role lands on the home page after login; their dashboard is one
        // click away from the account menu in the navbar.
        setLocation("/");
      } else {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: res.error || "Invalid credentials",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-3xl font-bold text-primary tracking-tight cursor-pointer">
              Fotizo
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-6">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm text-primary font-medium hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleAuthButton
            onLoggedIn={() => {
              toast({ title: "Welcome back!", description: "You have successfully signed in." });
              setLocation("/");
            }}
            onNeedsRole={setPendingGoogleToken}
          />

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                Sign up
              </span>
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-primary/5 rounded-xl border border-primary/10 p-6 text-sm">
          <h4 className="font-semibold text-primary mb-2">Demo Credentials</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li><strong>Buyer:</strong> buyer@fotizo.com</li>
            <li><strong>Seller:</strong> seller@fotizo.com</li>
            <li><strong>Manager:</strong> manager@fotizo.com</li>
            <li><strong>Developer:</strong> developer@fotizo.com</li>
            <li className="mt-2 text-foreground">Password for all: <strong>password</strong></li>
          </ul>
        </div>
      </div>

      <GoogleRolePickerDialog
        pendingToken={pendingGoogleToken}
        onClose={() => setPendingGoogleToken(null)}
        onComplete={(role) => {
          setPendingGoogleToken(null);
          toast({ title: "Account created!", description: "Welcome to Fotizo." });
          setLocation(`/dashboard/${role}`);
        }}
      />
    </div>
  );
}
