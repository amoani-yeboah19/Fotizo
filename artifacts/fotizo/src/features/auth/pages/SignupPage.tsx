import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ShoppingBag, Store, Shield, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["buyer", "seller", "manager", "developer"] as const),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const ROLES = [
  { id: "buyer", label: "Buyer", desc: "Buy Products & Hire Professionals", icon: ShoppingBag },
  { id: "seller", label: "Professional", desc: "Sell Products or Offer Services", icon: Store },
  { id: "manager", label: "Manager", desc: "Manage the Fotizo Platform", icon: Shield },
  { id: "developer", label: "Developer", desc: "Build with Fotizo APIs", icon: Code },
] as const;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: "buyer",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const res = await signup(data);
      if (res.success) {
        toast({
          title: "Account created!",
          description: "Welcome to Fotizo.",
        });
        setLocation(`/dashboard/${data.role}`);
      } else {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: res.error || "An error occurred",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="text-3xl font-bold text-primary tracking-tight cursor-pointer">
              Fotizo
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-6">Create an account</h1>
          <p className="text-muted-foreground mt-2">Join the global marketplace today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
              <Label className="text-base font-semibold">Choose your role</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLES.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setValue("role", r.id, { shouldValidate: true })}
                    className={`relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all ${
                      selectedRole === r.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`p-3 rounded-lg mr-4 ${selectedRole === r.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{r.label}</h4>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register("name")}
                  className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login">
              <span className="text-primary font-medium hover:underline cursor-pointer">
                Sign in
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
