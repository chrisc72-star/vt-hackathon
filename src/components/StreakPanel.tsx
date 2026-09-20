import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Flame, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const DAY = 86_400_000;
const GRID_DAYS = 364;

type Activity = { completedAt: number };

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getStreakMetrics(activities: Activity[]) {
  const activeDays = new Set(activities.map((item) => dateKey(new Date(item.completedAt))));
  const today = startOfDay(new Date());
  let current = 0;
  let cursor = today;
  if (!activeDays.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
  while (activeDays.has(dateKey(cursor))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY);
  }

  const ordered = [...activeDays].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    run = i > 0 && new Date(`${ordered[i]}T00:00:00`).getTime() - new Date(`${ordered[i - 1]}T00:00:00`).getTime() === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { activeDays, current, longest };
}

export function StreakPanel() {
  const since = startOfDay(new Date(new Date().getTime() - GRID_DAYS * DAY)).getTime();
  const activities = useQuery(api.courses.activityHistory, { since }) as Activity[] | undefined;
  const data = activities ?? [];
  const { activeDays, current, longest } = useMemo(() => getStreakMetrics(data), [data]);
  const cells = useMemo(() => {
    const end = startOfDay(new Date());
    return Array.from({ length: GRID_DAYS }, (_, index) => {
      const date = new Date(end.getTime() - (GRID_DAYS - 1 - index) * DAY);
      const key = dateKey(date);
      const count = data.filter((item) => dateKey(new Date(item.completedAt)) === key).length;
      return { key, date, count };
    });
  }, [data]);
  const maxCount = Math.max(...cells.map((cell) => cell.count), 1);
  const monthLabels = cells.reduce<{ label: string; index: number }[]>((labels, cell, index) => {
    const label = cell.date.toLocaleString("en-US", { month: "short" });
    if (index === 0 || labels[labels.length - 1]?.label !== label) labels.push({ label, index });
    return labels;
  }, []);

  return <section className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs text-[#b06a2a]">$ orbit activity --year</p><h1 className="mt-3 font-serif text-5xl font-semibold tracking-[-.03em]">Your learning streak.</h1><p className="mt-3 text-base leading-7 text-[#6d6a5e]">Every completed lesson leaves a mark. Keep the orbit moving.</p></div><div className="flex items-center gap-2 border border-[#eccfae] bg-[#fbeede] px-3 py-2 font-mono text-[11px] text-[#a85416]"><Flame className="size-4 text-[#d97b2b]" /> {current} day streak</div></div>
    <div className="border border-[#cfcabc] bg-[#fcfaf5] p-5 shadow-[6px_6px_0_#e6d4bc] sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="font-serif text-2xl font-semibold">{activeDays.size} active learning days</p><p className="mt-1 text-sm text-[#7a776b]">in the last year</p></div><div className="grid grid-cols-2 gap-5 sm:text-right"><div><p className="font-mono text-[10px] text-[#8a867a]">CURRENT</p><p className="mt-1 font-serif text-2xl font-semibold text-[#d97b2b]">{current}<span className="ml-1 text-sm">days</span></p></div><div><p className="font-mono text-[10px] text-[#8a867a]">LONGEST</p><p className="mt-1 font-serif text-2xl font-semibold text-[#1d3f2c]">{longest}<span className="ml-1 text-sm">days</span></p></div></div></div>
      <div className="mt-7 overflow-x-auto pb-1"><div className="relative min-w-[700px] pl-9"><div className="mb-2 flex h-4 text-[10px] text-[#7a776b]">{monthLabels.map((month) => <span key={`${month.label}-${month.index}`} className="absolute" style={{ left: `${(month.index / GRID_DAYS) * 100}%` }}>{month.label}</span>)}</div><div className="grid grid-flow-col grid-rows-7 gap-[3px]"><div className="pointer-events-none absolute -left-9 mt-0 flex h-full flex-col justify-between py-0.5 font-mono text-[9px] text-[#8a867a]"><span>Mon</span><span>Wed</span><span>Fri</span></div>{cells.map((cell) => { const intensity = cell.count === 0 ? "bg-[#edf0e9]" : cell.count / maxCount > 0.66 ? "bg-[#2e7545]" : cell.count / maxCount > 0.33 ? "bg-[#70a65c]" : "bg-[#b9d2a6]"; return <div key={cell.key} title={`${cell.key}: ${cell.count} lesson${cell.count === 1 ? "" : "s"}`} className={`size-[11px] rounded-[2px] ${intensity}`} />; })}</div></div></div>
      <div className="mt-5 flex items-center justify-between font-mono text-[10px] text-[#8a867a]"><span className="flex items-center gap-2"><TrendingUp className="size-3.5 text-[#d97b2b]" /> Complete a lesson to keep building your streak.</span><span className="flex items-center gap-1.5">Less <i className="size-2.5 rounded-[2px] bg-[#edf0e9]" /><i className="size-2.5 rounded-[2px] bg-[#b9d2a6]" /><i className="size-2.5 rounded-[2px] bg-[#70a65c]" /><i className="size-2.5 rounded-[2px] bg-[#2e7545]" /> More</span></div>
    </div>
  </section>;
}
