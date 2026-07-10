import type { ScheduleItem } from '@/shared/store/scheduleStore';

export interface CalendarDay {
  key: string;
  date: Date;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

export function addMonths(date: Date, count: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + count, 1);
  return next;
}

export function getMonthTitle(date: Date, locale: 'zh' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

export function getWeekdayLabels(locale: 'zh' | 'en'): string[] {
  if (locale === 'zh') return ['一', '二', '三', '四', '五', '六', '日'];
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

export function getCalendarDays(monthDate: Date): CalendarDay[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayFirstOffset);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_item, index) => {
    const date = addDays(gridStart, index);
    const key = toDateKey(date);
    return {
      key,
      date,
      dayOfMonth: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: key === todayKey,
    };
  });
}

export function normalizeRange(startDate: string, endDate: string) {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const range = normalizeRange(startDate, endDate);
  return date >= range.startDate && date <= range.endDate;
}

export function getRangeDayCount(startDate: string, endDate: string): number {
  const range = normalizeRange(startDate, endDate);
  const start = parseDateKey(range.startDate).getTime();
  const end = parseDateKey(range.endDate).getTime();
  return Math.floor((end - start) / 86400000) + 1;
}

export function isItemOnDate(item: ScheduleItem, date: string): boolean {
  return date >= item.startDate && date <= item.endDate;
}

export function doesItemOverlapRange(item: ScheduleItem, startDate: string, endDate: string): boolean {
  const range = normalizeRange(startDate, endDate);
  return item.startDate <= range.endDate && item.endDate >= range.startDate;
}

export function getMonthRange(monthDate: Date) {
  const startDate = toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const endDate = toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
  return { startDate, endDate };
}

export function formatDateRange(startDate: string, endDate: string, locale: 'zh' | 'en'): string {
  const range = normalizeRange(startDate, endDate);
  const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
  const startText = formatter.format(parseDateKey(range.startDate));
  const endText = formatter.format(parseDateKey(range.endDate));
  return range.startDate === range.endDate ? startText : `${startText} - ${endText}`;
}
