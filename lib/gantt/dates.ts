// 'YYYY-MM-DD' 문자열을 그대로 다루는 일자 산술. JS Date 파싱은 UTC로 해석돼
// 한국 시간대에서 하루 어긋날 수 있으므로, 외부에 노출하는 모든 함수의 입출력은
// 'YYYY-MM-DD' 문자열로 고정한다. 내부 계산도 UTC ms로만 한다.

const MS_PER_DAY = 86_400_000;

function toUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function addDays(iso: string, days: number): string {
  return fromUtcMs(toUtcMs(iso) + days * MS_PER_DAY);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function startOfWeekMonday(iso: string): string {
  const ms = toUtcMs(iso);
  const dow = new Date(ms).getUTCDay(); // 0=일, 1=월, ..., 6=토
  const offset = dow === 0 ? 6 : dow - 1;
  return fromUtcMs(ms - offset * MS_PER_DAY);
}

export function endOfWeekSunday(iso: string): string {
  return addDays(startOfWeekMonday(iso), 6);
}

// 사용자 로컬 시간대 기준 "오늘". UI가 보여주는 오늘선과 J9 Overdue 판정의 기준점.
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DateWindow = {
  start: string;
  end: string;
  days: number;
};

type TaskDates = { startDate: string | null; dueDate: string | null };

export function getDateWindow(tasks: TaskDates[], today: string): DateWindow {
  let tasksMin: string | null = null;
  let tasksMax: string | null = null;
  for (const t of tasks) {
    for (const d of [t.startDate, t.dueDate]) {
      if (!d) continue;
      if (tasksMin === null || d < tasksMin) tasksMin = d;
      if (tasksMax === null || d > tasksMax) tasksMax = d;
    }
  }
  // J13이 "오늘 강조선이 그려져 있다"를 무조건 단정하므로, today를 윈도우에 강제 포함.
  const minCandidate = tasksMin !== null && tasksMin < today ? tasksMin : today;
  const maxCandidate = tasksMax !== null && tasksMax > today ? tasksMax : today;
  const start = startOfWeekMonday(minCandidate);
  const end = endOfWeekSunday(maxCandidate);
  return { start, end, days: daysBetween(start, end) + 1 };
}

export function xForDate(iso: string, windowStart: string, pxPerDay: number): number {
  return daysBetween(windowStart, iso) * pxPerDay;
}
