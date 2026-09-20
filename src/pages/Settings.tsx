import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Check, LogOut, Mail, Moon, Orbit, Palette, ShieldCheck, Sun, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

type Theme = "light" | "dark";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("orbit-theme") === "dark" ? "dark" : "light";
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("orbit-theme", theme);
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1400);
    return () => window.clearTimeout(timer);
  }, [theme]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center bg-[#1d3f2c] text-[#f7e8cd]"><Orbit className="size-4" /></span>
            <span className="font-serif text-lg font-semibold">orbit</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:block">{user?.email ?? "student@workspace"}</span>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"><LogOut className="size-3.5" /> sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8 lg:py-12">
        <Link to="/dashboard" className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> back to workspace</Link>
        <div className="mb-10">
          <p className="font-mono text-xs text-[#b06a2a]">$ orbit settings</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-.03em]">Make Orbit yours.</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Tune how your learning workspace looks and keep your account access secure.</p>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4"><Palette className="size-4 text-[#d97b2b]" /><div><h2 className="text-sm font-semibold">Appearance</h2><p className="mt-0.5 text-xs text-muted-foreground">Choose the atmosphere for your study sessions.</p></div></div>
            <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setTheme("light")} className={`group rounded-sm border p-4 text-left transition-all ${theme === "light" ? "border-[#d97b2b] bg-[#fbeede] shadow-[3px_3px_0_#eccfae]" : "border-border hover:border-[#d9a46d]"}`}>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold"><Sun className="size-4 text-[#d97b2b]" /> Light mode</span><span className={`flex size-4 items-center justify-center rounded-full border ${theme === "light" ? "border-[#d97b2b] bg-[#d97b2b] text-white" : "border-muted-foreground/40"}`}>{theme === "light" && <Check className="size-3" />}</span></div>
                  <div className="mt-4 h-14 rounded-sm border border-[#d9d4c9] bg-[#faf8f2] p-2"><div className="h-2 w-2/3 rounded bg-[#1d3f2c]" /><div className="mt-2 h-1.5 w-1/2 rounded bg-[#d97b2b] opacity-70" /><div className="mt-2 h-1.5 w-3/4 rounded bg-[#d9d4c9]" /></div>
                  <p className="mt-3 text-xs text-muted-foreground">Warm paper, orange signals, dark green anchors.</p>
                </button>
                <button onClick={() => setTheme("dark")} className={`group rounded-sm border p-4 text-left transition-all ${theme === "dark" ? "border-[#d97b2b] bg-[#26392d] shadow-[3px_3px_0_#8c552f]" : "border-border hover:border-[#d9a46d]"}`}>
                  <div className="flex items-center justify-between"><span className={`flex items-center gap-2 text-sm font-semibold ${theme === "dark" ? "text-[#f7ecda]" : ""}`}><Moon className="size-4 text-[#d97b2b]" /> Dark mode</span><span className={`flex size-4 items-center justify-center rounded-full border ${theme === "dark" ? "border-[#e8913a] bg-[#d97b2b] text-white" : "border-muted-foreground/40"}`}>{theme === "dark" && <Check className="size-3" />}</span></div>
                  <div className="mt-4 h-14 rounded-sm border border-[#415344] bg-[#18251d] p-2"><div className="h-2 w-2/3 rounded bg-[#f7ecda]" /><div className="mt-2 h-1.5 w-1/2 rounded bg-[#d97b2b]" /><div className="mt-2 h-1.5 w-3/4 rounded bg-[#415344]" /></div>
                  <p className={`mt-3 text-xs ${theme === "dark" ? "text-[#c2cfc1]" : "text-muted-foreground"}`}>Deep green workspace, softened cream type, amber focus.</p>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">{saved ? <><Check className="size-3 text-[#d97b2b]" /> preference saved locally</> : "Your preference is saved on this device."}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4"><ShieldCheck className="size-4 text-[#d97b2b]" /><div><h2 className="text-sm font-semibold">Account & security</h2><p className="mt-0.5 text-xs text-muted-foreground">Manage how you access Orbit.</p></div></div>
            <div className="divide-y divide-border">
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"><div className="flex gap-3"><Mail className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-sm font-semibold">Email address</p><p className="mt-1 text-xs text-muted-foreground">{user?.email ?? "Your verified email"}</p></div></div><span className="inline-flex w-fit items-center gap-1.5 border border-[#cbdac5] bg-[#edf4e9] px-2.5 py-1 font-mono text-[10px] text-[#46723d]"><Check className="size-3" /> verified</span></div>
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"><div className="flex gap-3"><Terminal className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-sm font-semibold">Passwordless sign-in</p><p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Orbit uses one-time email codes instead of passwords. There is no password to change or store.</p></div></div><Button variant="outline" onClick={() => navigate("/auth")} className="w-fit rounded-sm font-mono text-xs">Send a new code</Button></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
