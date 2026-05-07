"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { loginWithPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { Alert } from "@/components/ui/alert";
import { LogoLockup } from "@/components/ui/logo-lockup";

const DEMO_TENANT_ID = "11111111-1111-7111-8111-111111111111";
const DEV_PASSWORD = "morfosis123";

const demoAccounts = [
  { label: "Master Admin", email: "master.admin@morfoschools.local", role: "Platform admin + act-as" },
  { label: "School Admin", email: "school.admin@morfoschools.local", role: "Operasional sekolah" },
  { label: "Academic Admin", email: "academic.admin@morfoschools.local", role: "Akademik & kurikulum" },
  { label: "Teacher", email: "teacher@morfoschools.local", role: "Kelas, ujian, grading" },
  { label: "Student", email: "student@morfoschools.local", role: "Exam gate, result" },
  { label: "Parent", email: "parent@morfoschools.local", role: "Progress anak" },
  { label: "Finance", email: "finance@morfoschools.local", role: "Billing & pembayaran" },
  { label: "Proctor", email: "proctor@morfoschools.local", role: "Monitoring ujian" },
  { label: "Content Reviewer", email: "reviewer@morfoschools.local", role: "Review materi" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = React.useState(DEMO_TENANT_ID);
  const [email, setEmail] = React.useState("teacher@morfoschools.local");
  const [password, setPassword] = React.useState(DEV_PASSWORD);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword({ tenantId, email, password });
      router.push("/app");
    } catch (err) {
      const message = err instanceof Error ? err.message : "login_failed";
      setError(
        message === "invalid_demo_credentials"
          ? "Akun demo tidak cocok. Gunakan tenant demo dan password morfosis123."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-[color:var(--foreground)] sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-20 bg-[url('/bg.webp')] bg-cover bg-center bg-no-repeat blur-[2px] scale-[1.01]" />
      <div className="absolute inset-0 -z-10 bg-[color:var(--login-image-overlay)] backdrop-blur-[1.5px] transition-colors duration-300" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,var(--body-glow-a),transparent_34%),radial-gradient(circle_at_80%_80%,var(--body-glow-b),transparent_32%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden  sm:p-8 lg:p-10">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[color:var(--brand-soft)] blur-3xl" />
          <div className="relative">
            <div className="max-w-2xl">
              <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
                Masuk ke LMS yang siap ujian nasional sekolah.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[color:var(--muted-foreground)]">
                Login ini memakai backend auth asli: cookie httpOnly, CSRF token,
                RBAC server-side, dan session cache browser tanpa menyimpan raw token.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Tenant isolated",
                  desc: "X-Tenant-ID tetap eksplisit.",
                },
                {
                  icon: ServerCog,
                  title: "BE clean",
                  desc: "Backend auth aktif.",
                },
                {
                  icon: LockKeyhole,
                  title: "Secure session",
                  desc: "httpOnly cookie + CSRF.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--login-feature-card)] p-4 shadow-sm backdrop-blur-md transition-colors duration-300"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-extrabold text-[color:var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[40px] bg-[color-mix(in_oklch,var(--surface)_50%,transparent)] p-5 shadow-[0_30px_80px_rgba(9,17,28,0.18)] backdrop-blur-xl sm:p-7">
          <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
                  Secure sign in
                </p>
                <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.035em]">
                  Masuk ke tenant sekolah
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Gunakan akun demo atau kredensial sekolah.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-strong)] text-white">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <FloatingInput
                label="Tenant ID"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              />
              <FloatingInput
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <FloatingInput
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error ? (
                <Alert tone="error" title="Login gagal" description={error} />
              ) : null}
              <Button
                type="submit"
                className="w-full justify-center"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {loading ? "Memvalidasi..." : "Masuk ke LMS"}
              </Button>
            </form>
          </div>

          <div className="mt-5 rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Demo accounts
            </p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setEmail(account.email);
                    setPassword(DEV_PASSWORD);
                    const isMasterAdmin = account.email === "master.admin@morfoschools.local";
                    setTenantId(isMasterAdmin ? "" : DEMO_TENANT_ID);

                    setError(null);
                    setLoading(true);
                    try {
                      await loginWithPassword({
                        ...(isMasterAdmin ? {} : { tenantId: DEMO_TENANT_ID }),
                        email: account.email,
                        password: DEV_PASSWORD,
                      });
                      router.push("/app");
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "login_failed";
                      setError(message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-transparent bg-[color:var(--surface)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)] disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[color:var(--foreground)]">
                      {account.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                      {account.email}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs font-semibold text-[color:var(--brand-strong)] sm:flex">
                    <CheckCircle2 className="h-4 w-4" /> {account.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
