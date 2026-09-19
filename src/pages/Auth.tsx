import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ArrowRight, Loader2, Mail, Orbit, ShieldCheck, Terminal } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && isAuthenticated) navigate(redirect); }, [authLoading, isAuthenticated, navigate, redirect]);
  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); setStep({ email: formData.get("email") as string }); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send verification code."); }
    finally { setIsLoading(false); }
  };
  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); navigate(redirect); }
    catch { setError("That code was not accepted. Check your email and try again."); setOtp(""); setIsLoading(false); }
  };

  return <main className="min-h-screen bg-[#f7f7f2] px-6 py-8 font-mono text-[#172019] sm:py-12">
    <div className="mx-auto flex max-w-6xl items-center justify-between text-xs"><button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#607067] hover:text-[#173f2b]"><ArrowLeft className="size-3.5" /> back to home</button><span className="flex items-center gap-2 text-[#789071]"><span className="size-1.5 rounded-full bg-[#83b35b]" /> secure session</span></div>
    <div className="mx-auto flex min-h-[calc(100vh-150px)] max-w-6xl items-center justify-center py-12"><div className="grid w-full max-w-4xl overflow-hidden border border-[#c7d1c3] bg-[#fbfcf8] shadow-[10px_10px_0_#e4e9df] md:grid-cols-[.8fr_1fr]">
      <div className="hidden border-r border-[#d8dfd4] bg-[#eef3e9] p-9 md:block"><div className="flex size-10 items-center justify-center bg-[#173f2b] text-[#d9f2b5]"><Terminal className="size-5" /></div><p className="mt-12 text-xs text-[#6d7d6c]">$ orbit init</p><h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.06em]">A better way<br />to read code.</h1><div className="mt-10 space-y-4 text-xs leading-5 text-[#627161]"><p><span className="text-[#709a56]">✓</span> Personalized curriculum</p><p><span className="text-[#709a56]">✓</span> GitHub-first workflow</p><p><span className="text-[#709a56]">✓</span> Commit as you learn</p></div><div className="mt-24 border-t border-[#d2dccd] pt-4 text-[10px] text-[#879489]">// your code stays yours</div></div>
      <Card className="rounded-none border-0 bg-transparent shadow-none"><CardHeader className="p-8 pb-5 sm:p-10 sm:pb-5"><div className="mb-6 flex items-center gap-2 text-xs text-[#6c8860] md:hidden"><Orbit className="size-4" /> orbit</div>{step === "signIn" ? <><p className="text-[11px] uppercase tracking-[.16em] text-[#7d8b80]">/ {mode === "signup" ? "create account" : "access workspace"}</p><CardTitle className="mt-3 text-2xl tracking-[-.05em]">{mode === "signup" ? "Create your Orbit account." : "Log in to start learning."}</CardTitle><CardDescription className="mt-2 font-mono text-xs leading-5 text-[#728075]">Use your email. We’ll send a one-time code to verify it’s you.</CardDescription></> : <><p className="text-[11px] uppercase tracking-[.16em] text-[#7d8b80]">/ second factor</p><CardTitle className="mt-3 text-2xl tracking-[-.05em]">Check your inbox.</CardTitle><CardDescription className="mt-2 font-mono text-xs leading-5 text-[#728075]">Enter the 6-digit code sent to <span className="text-[#345a37]">{step.email}</span>.</CardDescription></>}</CardHeader>
        {step === "signIn" ? <form onSubmit={handleEmailSubmit}><CardContent className="p-8 pt-3 sm:p-10 sm:pt-3"><label className="mb-2 block text-[11px] font-semibold text-[#607067]">EMAIL ADDRESS</label><div className="relative"><Mail className="absolute left-3 top-3 size-4 text-[#91a098]" /><Input name="email" placeholder="you@example.com" type="email" className="h-11 rounded-sm border-[#ccd6c8] bg-white pl-10 font-mono text-sm focus-visible:ring-[#76a955]" disabled={isLoading} required /></div>{error && <p className="mt-3 text-xs text-[#a34c35]">{error}</p>}<Button type="submit" disabled={isLoading} className="mt-6 h-11 w-full rounded-sm bg-[#173f2b] font-mono text-xs text-white hover:bg-[#285a3d]">{isLoading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Continue"} <ArrowRight className="ml-2 size-3.5" /></>}</Button></CardContent><div className="px-8 pb-8 text-xs text-[#728075] sm:px-10 sm:pb-10">{mode === "signup" ? <>Already have an account? <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="font-semibold text-[#39712e] underline underline-offset-4 hover:text-[#173f2b]">Log in</button></> : <>New to Orbit? <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="font-semibold text-[#39712e] underline underline-offset-4 hover:text-[#173f2b]">Create an account</button></>}</div></form> : <form onSubmit={handleOtpSubmit}><CardContent className="p-8 pt-3 sm:p-10 sm:pt-3"><input type="hidden" name="email" value={step.email} /><input type="hidden" name="code" value={otp} /><div className="flex justify-center py-3"><InputOTP value={otp} onChange={setOtp} maxLength={6} disabled={isLoading}><InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} className="rounded-none border-[#ccd6c8] bg-white font-mono" />)}</InputOTPGroup></InputOTP></div>{error && <p className="mt-3 text-center text-xs text-[#a34c35]">{error}</p>}<Button type="submit" disabled={isLoading || otp.length !== 6} className="mt-6 h-11 w-full rounded-sm bg-[#173f2b] font-mono text-xs text-white hover:bg-[#285a3d]">{isLoading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "signup" ? "Verify & create account" : "Verify & enter"} <ArrowRight className="ml-2 size-3.5" /></>}</Button></CardContent><CardFooter className="flex-col gap-2 p-8 pt-0 sm:px-10"><Button type="button" variant="ghost" onClick={() => { setStep("signIn"); setOtp(""); setError(null); }} className="h-auto font-mono text-[11px] text-[#6c7c70]">Use a different email</Button></CardFooter></form>}
        <div className="flex items-center gap-2 border-t border-[#e0e5dd] px-8 py-4 text-[10px] text-[#89958b] sm:px-10"><ShieldCheck className="size-3.5 text-[#77a655]" /> Email OTP keeps your workspace protected.</div>
      </Card>
    </div></div>
  </main>;
}
export default function AuthPage(props: AuthProps) { return <Suspense><Auth {...props} /></Suspense>; }
