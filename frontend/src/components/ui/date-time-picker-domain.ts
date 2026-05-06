export type DateTimeParts = {
  date: string;
  hour: string;
  minute: string;
};

export type CalendarDay = {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseDateTimeValue(value?: string): DateTimeParts {
  if (!value) return { date: "", hour: "07", minute: "00" };

  const [date = "", time = ""] = value.split("T");
  const [rawHour = "07", rawMinute = "00"] = time.split(":");

  return {
    date,
    hour: rawHour.padStart(2, "0").slice(0, 2),
    minute: rawMinute.padStart(2, "0").slice(0, 2),
  };
}

export function composeDateTimeValue(parts: DateTimeParts): string {
  if (!parts.date) return "";
  return `${parts.date}T${parts.hour || "00"}:${parts.minute || "00"}`;
}

export function buildHourOptions(): string[] {
  return Array.from({ length: 24 }, (_, index) => padTimePart(index));
}

export function buildMinuteOptions(step = 5): string[] {
  const safeStep = step > 0 && step <= 30 ? step : 5;
  return Array.from({ length: Math.ceil(60 / safeStep) }, (_, index) => padTimePart(index * safeStep)).filter(
    (minute) => Number(minute) < 60,
  );
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date | null {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function addMonths(month: Date, amount: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + amount, 1);
}

export function getMonthLabel(month: Date): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
}

export function buildCalendarDays(month: Date, selectedDate = "", today = new Date()): CalendarDay[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);
  const todayKey = toDateKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDate,
    };
  });
}
