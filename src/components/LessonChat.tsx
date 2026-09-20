import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

type LessonChatProps = {
  courseId: Id<"courses">;
  moduleIndex: number;
  lessonIndex: number;
  lessonTitle: string;
  objective: string;
  explanation: string;
  exercise: string;
  relevantFiles: string[];
};

const MESSAGE_LIMIT = 20;
const TOKEN_LIMIT = 20_000;

export function LessonChat(props: LessonChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messages = useQuery(api.chat.lessonMessages, isOpen ? { courseId: props.courseId, moduleIndex: props.moduleIndex, lessonIndex: props.lessonIndex } : "skip") ?? [];
  const usage = useQuery(api.chat.todayUsage, isOpen ? {} : "skip");
  const askLesson = useAction(api.chat.askLesson);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || isSending) return;
    setIsSending(true);
    setError("");
    try {
      await askLesson({ ...props, question: question.trim() });
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach your lesson tutor.");
    } finally {
      setIsSending(false);
    }
  };

  const messageCount = usage?.messageCount ?? 0;
  const tokenCount = usage?.tokenCount ?? 0;
  const exhausted = messageCount >= MESSAGE_LIMIT || tokenCount >= TOKEN_LIMIT;

  if (!isOpen) {
    return <button type="button" onClick={() => setIsOpen(true)} className="mt-8 flex w-full items-center justify-between border border-[#d7dfd2] bg-[#eef3e9] px-4 py-3 text-left transition-colors hover:border-[#d97b2b] hover:bg-[#f8efe3]"><span className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-[#1d3f2c] text-[#f7e8cd]"><MessageCircle className="size-4" /></span><span><span className="block text-xs font-semibold">Have a question about this lesson?</span><span className="mt-0.5 block text-[11px] text-[#6d6a5e]">Ask Claude Haiku for a hint, explanation, or code-reading help.</span></span></span><Sparkles className="size-4 text-[#d97b2b]" /></button>;
  }

  return <section className="mt-8 overflow-hidden border border-[#cfcabc] bg-[#fcfaf5] shadow-[4px_4px_0_#e6d4bc]">
    <div className="flex items-center justify-between border-b border-[#e0dbd0] bg-[#f5f0e6] px-4 py-3"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-[#1d3f2c] text-[#f7e8cd]"><Sparkles className="size-3.5" /></span><div><p className="text-xs font-semibold">Ask Orbit’s tutor</p><p className="font-mono text-[9px] text-[#8a867a]">CLAUDE HAIKU · LESSON CONTEXT ONLY</p></div></div><button type="button" onClick={() => setIsOpen(false)} className="text-[#8a867a] hover:text-[#1d3f2c]"><X className="size-4" /></button></div>
    <div className="max-h-72 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 && <div className="border-l-2 border-[#d97b2b] bg-[#f8efe3] p-3 text-xs leading-5 text-[#5d5748]">Ask about <strong>{props.lessonTitle}</strong>. I’ll use this lesson’s objective, explanation, exercise, and referenced files to help.</div>}
      {messages.map((message) => <div key={message._id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] px-3 py-2 text-xs leading-5 ${message.role === "user" ? "bg-[#1d3f2c] text-[#f7ecda]" : "border border-[#e0dbd0] bg-white text-[#4e574d]"}`}>{message.content}</div></div>)}
      {isSending && <div className="flex items-center gap-2 text-[11px] text-[#8a867a]"><Loader2 className="size-3.5 animate-spin text-[#d97b2b]" /> Thinking through the lesson...</div>}
    </div>
    <div className="border-t border-[#e0dbd0] p-4"><form onSubmit={handleSubmit} className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={isSending || exhausted} placeholder={exhausted ? "Daily chat allowance reached" : "e.g. Why does this pattern matter here?"} maxLength={2000} className="min-w-0 flex-1 border border-[#d3cfc2] bg-white px-3 py-2 text-xs outline-none placeholder:text-[#aaa599] focus:border-[#d97b2b]" /><button type="submit" disabled={isSending || exhausted || !question.trim()} className="flex size-9 shrink-0 items-center justify-center bg-[#1d3f2c] text-[#f7ecda] disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-3.5" /></button></form>{error && <p className="mt-2 text-[11px] text-[#b04a1e]">{error}</p>}<div className="mt-3 flex flex-wrap justify-between gap-2 font-mono text-[9px] text-[#8a867a]"><span>{Math.max(0, MESSAGE_LIMIT - messageCount)} messages left today</span><span>{Math.max(0, TOKEN_LIMIT - tokenCount).toLocaleString()} tokens left today</span></div></div>
  </section>;
}
