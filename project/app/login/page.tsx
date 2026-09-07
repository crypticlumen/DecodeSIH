"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { demoUsers } from "@/lib/demo-data";
import { getItem, setItem } from "@/lib/persistence";
import type { User, UserRole } from "@/lib/types";
import Icon from "@/components/Icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useAppStore();

  const [storedUsers, setStoredUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("consumer");

  useEffect(() => {
    const existing = getItem<User[]>("registered_users", []);
    setStoredUsers(existing);
    // Mark hydration complete after store is read so we can check currentUser
    setHydrated(true);
  }, []);

  /* ---- Redirect already-authenticated users ---- */
  useEffect(() => {
    if (hydrated && currentUser) {
      router.replace("/");
    }
  }, [hydrated, currentUser, router]);

  const allUsers = [...demoUsers, ...storedUsers];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (loginPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = allUsers.find(
        (u) => u.email.toLowerCase() === loginEmail.toLowerCase().trim()
      );
      if (!user) {
        setError("User not found. Please register first.");
        setLoading(false);
        return;
      }
      login(user);
      setLoading(false);
      router.push("/");
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regPhone.trim() ||
      !regPassword.trim() ||
      !regConfirmPassword.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const emailExists = allUsers.some(
      (u) => u.email.toLowerCase() === regEmail.toLowerCase().trim()
    );
    if (emailExists) {
      setError("An account with this email already exists.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        role: regRole,
        kycStatus: "pending",
        createdAt: new Date().toISOString(),
      };
      const updated = [...storedUsers, newUser];
      setStoredUsers(updated);
      setItem("registered_users", updated);
      login(newUser);
      setLoading(false);
      router.push("/");
    }, 600);
  };

  /* ---- Show skeleton while checking auth state ---- */
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  /* ---- Already logged in — don't render login form ---- */
  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
            <Icon name="Zap" className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            ChargeSure
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Predictive EV mobility for India
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Log in to your ChargeSure account to continue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && activeTab === "login" && (
                    <div className="rounded-lg bg-red-500/10 text-red-400 p-3 text-sm border border-red-500/20">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Demo users: arjun.mehta@example.com / priya.sharma@example.com (any password ≥6 chars)
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                        Logging in…
                      </span>
                    ) : (
                      "Log in"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create account</CardTitle>
                <CardDescription>
                  Join ChargeSure to start planning smarter EV routes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && activeTab === "register" && (
                    <div className="rounded-lg bg-red-500/10 text-red-400 p-3 text-sm border border-red-500/20">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full name</Label>
                    <Input
                      id="reg-name"
                      placeholder="Rahul Verma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="+91-9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-role">Role</Label>
                    <Select
                      onValueChange={(value: string | null) => {
                        if (value) setRegRole(value as UserRole);
                      }}
                      defaultValue={regRole}
                    >
                      <SelectTrigger id="reg-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consumer">Consumer</SelectItem>
                        <SelectItem value="cpo">CPO</SelectItem>
                        <SelectItem value="fleet_operator">
                          Fleet Operator
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm password</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                        Creating account…
                      </span>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}