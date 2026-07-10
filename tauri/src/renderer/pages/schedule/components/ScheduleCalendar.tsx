import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleItem } from '@/shared/store/scheduleStore';
import {
  formatDateRange,
  getCalendarDays,
  getWeekdayLabels,
  isDateInRange,
  isItemOnDate,
  normalizeRange,
} from '../utils/date';

interface ScheduleCalendarProps {
  activeItemId: string | null;
  items: ScheduleItem[];
  locale: 'zh' | 'en';
  monthDate: Date;
  onItemClick: (item: ScheduleItem) => void;
  onRangeCommit: (startDate: string, endDate: string, openEditor?: boolean) => void;
  onRangePreview: (startDate: string, endDate: string) => void;
  selectedEndDate: string;
  selectedStartDate: string;
  t: (key: string) => string;
}

export function ScheduleCalendar({
  activeItemId,
  items,
  locale,
  monthDate,
  onItemClick,
  onRangeCommit,
  onRangePreview,
  selectedEndDate,
  selectedStartDate,
  t,
}: ScheduleCalendarProps) {
  const [dragStartDate, setDragStartDate] = useState('');
  const [dragEndDate, setDragEndDate] = useState('');
  const dragEndDateRef = useRef('');
  const days = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleItem[]>();

    days.forEach((day) => grouped.set(day.key, []));
    items.forEach((item) => {
      days.forEach((day) => {
        if (isItemOnDate(item, day.key)) {
          grouped.get(day.key)?.push(item);
        }
      });
    });
    grouped.forEach((dayItems) => {
      dayItems.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt);
    });

    return grouped;
  }, [days, items]);
  const visibleRange = dragStartDate
    ? normalizeRange(dragStartDate, dragEndDate || dragStartDate)
    : normalizeRange(selectedStartDate, selectedEndDate);

  const finishDrag = useCallback(() => {
    if (!dragStartDate) return;

    const range = normalizeRange(dragStartDate, dragEndDateRef.current || dragStartDate);
    const draggedAcrossDays = range.startDate !== range.endDate;
    onRangeCommit(range.startDate, range.endDate, draggedAcrossDays);
    dragEndDateRef.current = '';
    setDragStartDate('');
    setDragEndDate('');
  }, [dragStartDate, onRangeCommit]);

  useEffect(() => {
    if (!dragStartDate) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const cell = element?.closest<HTMLElement>('.schedule-day-cell');
      const date = cell?.dataset.date;
      if (!date) return;
      if (date === dragEndDateRef.current) return;

      dragEndDateRef.current = date;
      setDragEndDate(date);
      const range = normalizeRange(dragStartDate, date);
      onRangePreview(range.startDate, range.endDate);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
    };
  }, [dragStartDate, finishDrag, onRangePreview]);

  const startDrag = (date: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragStartDate(date);
    setDragEndDate(date);
    dragEndDateRef.current = date;
    onRangePreview(date, date);
  };

  const updateDrag = (date: string) => {
    if (!dragStartDate) return;
    if (date === dragEndDateRef.current) return;

    dragEndDateRef.current = date;
    setDragEndDate(date);
    const range = normalizeRange(dragStartDate, date);
    onRangePreview(range.startDate, range.endDate);
  };

  const selectSingleDay = (date: string) => {
    onRangeCommit(date, date, true);
  };

  return (
    <section className="schedule-calendar-panel">
      <div className="schedule-weekdays">
        {weekdayLabels.map((label) => (
          <span key={label} className="schedule-weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="schedule-calendar-grid">
        {days.map((day) => {
          const dayItems = itemsByDate.get(day.key) ?? [];
          const visibleItemLimit = dayItems.length > 3 ? 2 : 3;
          const visibleItems = dayItems.slice(0, visibleItemLimit);
          const hiddenCount = dayItems.length - visibleItems.length;
          const selected = isDateInRange(day.key, visibleRange.startDate, visibleRange.endDate);
          const label = `${day.key} ${t('schedule.dayCell')}`;

          return (
            <div
              aria-label={label}
              className={[
                'schedule-day-cell',
                day.inCurrentMonth ? '' : 'is-muted',
                day.isToday ? 'is-today' : '',
                selected ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              key={day.key}
              data-date={day.key}
              onDoubleClick={() => selectSingleDay(day.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') selectSingleDay(day.key);
              }}
              onPointerDown={(event) => startDrag(day.key, event)}
              onPointerEnter={() => updateDrag(day.key)}
              role="button"
              tabIndex={0}
            >
              <div className="schedule-day-head">
                <span className="schedule-day-number">{day.dayOfMonth}</span>
                {day.isToday && <span className="schedule-today-dot">{t('schedule.today')}</span>}
              </div>

              <div className="schedule-day-items">
                {visibleItems.map((item) => (
                  <button
                    className={`schedule-item-chip${item.id === activeItemId ? ' is-active' : ''}`}
                    key={item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onItemClick(item);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{ '--schedule-item-color': item.color } as React.CSSProperties}
                    title={`${item.title} · ${formatDateRange(item.startDate, item.endDate, locale)}`}
                    type="button"
                  >
                    <span className="schedule-item-chip-text">{item.title}</span>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <span className="schedule-more-chip">
                    <span className="schedule-more-chip-text">
                      {t('schedule.moreItems').replace('{count}', `${hiddenCount}`)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
