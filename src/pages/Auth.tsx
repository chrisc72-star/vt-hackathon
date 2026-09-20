import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, Terminal } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps { redirectAfterAuth?: string; }
function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => { if (!authLoading && isAuthenticated) navigate(redirect); }, [authLoading, isAuthenticated, navigate, redirect]);
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); setStep({ email: formData.get("email") as string }); setResendCooldown(30); setResendMessage(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send verification code."); }
    finally { setIsLoading(false); }
  };
  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null); setResendMessage(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); navigate(redirect); }
    catch { setError("That code was not accepted. Check your email and try again."); setOtp(""); setIsLoading(false); }
  };

  const handleResendCode = async () => {
    if (typeof step === "string" || resendCooldown > 0 || isLoading) return;
    setIsLoading(true); setError(null); setResendMessage(null);
    try {
      const formData = new FormData();
      formData.set("email", step.email);
      await signIn("email-otp", formData);
      setOtp("");
      setResendCooldown(30);
      setResendMessage("A new verification code was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return <main className="min-h-screen bg-[#faf8f2] px-6 py-8 text-[#1f231c] sm:py-12">
    <div className="mx-auto flex max-w-6xl items-center justify-between text-xs"><button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#6d6a5e] hover:text-[#1d3f2c]"><ArrowLeft className="size-3.5" /> back to home</button><span className="flex items-center gap-2 font-mono text-[#a06a34]"><span className="size-1.5 rounded-full bg-[#e8913a]" /> secure session</span></div>
    <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-6xl items-center justify-center py-12"><div className="grid w-full max-w-4xl overflow-hidden border border-[#d3cfc2] bg-[#fcfaf5] shadow-[10px_10px_0_#e6d4bc] md:grid-cols-[.8fr_1fr]">
      <div className="hidden border-r border-[#e2ddd1] bg-[#f5f0e6] p-9 md:block"><img src="/orbit_logo_orange.svg" alt="Orbit" className="h-10 w-auto max-w-[150px] object-contain object-left" /><p className="mt-12 font-mono text-xs text-[#6d6a5e]">$ orbit init</p><h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-[-.02em]">A better way<br />to read code.</h1><div className="mt-10 space-y-4 text-xs leading-5 text-[#66644f]"><p><span className="text-[#d97b2b]">✓</span> Personalized curriculum</p><p><span className="text-[#d97b2b]">✓</span> GitHub-first workflow</p><p><span className="text-[#d97b2b]">✓</span> Commit as you learn</p></div><div className="mt-24 border-t border-[#ddd6c9] pt-4 font-mono text-[10px] text-[#8a867a]">// your code stays yours</div></div>
      <Card className="rounded-none border-0 bg-transparent shadow-none"><CardHeader className="p-8 pb-5 sm:p-10 sm:pb-5"><div className="mb-6 md:hidden"><img src="/orbit_logo_orange.svg" alt="Orbit" className="h-10 w-auto max-w-[150px] object-contain object-left" /></div>{step === "signIn" ? <><p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#8a867a]">/ {mode === "signup" ? "create account" : "access workspace"}</p><CardTitle className="mt-3 font-serif text-3xl font-semibold tracking-[-.02em]">{mode === "signup" ? "Create your Orbit account." : "Log in to start learning."}</CardTitle><CardDescription className="mt-2 text-sm leading-6 text-[#6d6a5e]">Use your email. We’ll send a one-time code to verify it’s you.</CardDescription></> : <><p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#8a867a]">/ second factor</p><CardTitle className="mt-3 font-serif text-3xl font-semibold tracking-[-.02em]">Check your inbox.</CardTitle><CardDescription className="mt-2 text-sm leading-6 text-[#6d6a5e]">Enter the 6-digit code sent to <span className="font-medium text-[#a85416]">{step.email}</span>.</CardDescription></>}</CardHeader>
        {step === "signIn" ? <form onSubmit={handleEmailSubmit}><CardContent className="p-8 pt-3 sm:p-10 sm:pt-3"><label className="mb-2 block font-mono text-[11px] font-semibold text-[#5d6b58]">EMAIL ADDRESS</label><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#9a958a]" /><Input name="email" placeholder="you@example.com" type="email" className="h-11 rounded-sm border-[#d3cfc2] bg-white pl-10 text-sm focus-visible:ring-[#d97b2b]" disabled={isLoading} required /></div>{error && <p className="mt-3 text-xs text-[#b04a1e]">{error}</p>}<Button type="submit" disabled={isLoading} className="mt-6 h-11 w-full rounded-sm bg-[#1d3f2c] text-xs text-[#f7ecda] hover:bg-[#2a5a40]">{isLoading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Continue"} <ArrowRight className="ml-2 size-3.5" /></>}</Button></CardContent><div className="px-8 pb-8 text-xs text-[#6d6a5e] sm:px-10 sm:pb-10">{mode === "signup" ? <>Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="font-semibold text-[#a85416] underline underline-offset-4 hover:text-[#c2571a]">Log in</button></> : <>New to Orbit? <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="font-semibold text-[#a85416] underline underline-offset-4 hover:text-[#c2571a]">Create an account</button></>}</div></form> : <form onSubmit={handleOtpSubmit}><CardContent className="p-8 pt-3 sm:p-10 sm:pt-3"><input type="hidden" name="email" value={step.email} /><input type="hidden" name="code" value={otp} /><div className="flex justify-center py-3"><InputOTP value={otp} onChange={setOtp} maxLength={6} disabled={isLoading}><InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} className="rounded-none border-[#d3cfc2] bg-white" />)}</InputOTPGroup></InputOTP></div>{error && <p className="mt-3 text-center text-xs text-[#b04a1e]">{error}</p>}{resendMessage && <p className="mt-3 text-center text-xs text-[#426b42]">{resendMessage}</p>}<div className="mt-4 text-center text-xs text-[#6d6a5e]"><span>Didn’t receive the code? </span><button type="button" onClick={handleResendCode} disabled={isLoading || resendCooldown > 0} className="font-semibold text-[#a85416] underline underline-offset-4 hover:text-[#c2571a] disabled:cursor-not-allowed disabled:text-[#9a958a]">{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Send code again"}</button></div><Button type="submit" disabled={isLoading || otp.length !== 6} className="mt-6 h-11 w-full rounded-sm bg-[#1d3f2c] text-xs text-[#f7ecda] hover:bg-[#2a5a40]">{isLoading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "signup" ? "Verify & create account" : "Verify & enter"} <ArrowRight className="ml-2 size-3.5" /></>}</Button></CardContent><CardFooter className="flex-col gap-2 p-8 pt-0 sm:px-10"><Button type="button" variant="ghost" onClick={() => { setStep("signIn"); setOtp(""); setError(null); setResendMessage(null); setResendCooldown(0); }} className="h-auto text-[11px] text-[#6d6a5e]">Use a different email</Button></CardFooter></form>}
        <div className="flex items-center gap-2 border-t border-[#e2ddd1] px-8 py-4 font-mono text-[10px] text-[#8a867a] sm:px-10"><ShieldCheck className="size-3.5 text-[#d97b2b]" /> Email OTP keeps your workspace protected.</div>
      </Card>
    </div></div>
  </main>;
}
export default function AuthPage(props: AuthProps) { return <Suspense><Auth {...props} /></Suspense>; }
