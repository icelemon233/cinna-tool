import React, { useMemo, useState } from 'react';
import { App, Button, Modal, Statistic } from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  SCHEDULE_COLORS,
  useScheduleStore,
  type ScheduleItem,
} from '@/shared/store/scheduleStore';
import { useTranslation } from '@/shared/i18n';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { ScheduleEditor } from './components/ScheduleEditor';
import { ScheduleWorkList } from './components/ScheduleWorkList';
import type { ScheduleDraft } from './types';
import {
  addMonths,
  doesItemOverlapRange,
  getMonthRange,
  getMonthTitle,
  getRangeDayCount,
  isItemOnDate,
  normalizeRange,
  parseDateKey,
  toDateKey,
} from './utils/date';
import './index.css';

interface SchedulePageProps {
  active: boolean;
}

function createDraft(startDate: string, endDate: string, color: string): ScheduleDraft {
  return {
    title: '',
    startDate,
    endDate,
    color,
    notes: '',
  };
}

function getNextColor(items: ScheduleItem[], offset = 0) {
  return SCHEDULE_COLORS[(items.length + offset) % SCHEDULE_COLORS.length];
}

const SchedulePage: React.FC<SchedulePageProps> = ({ active }) => {
  const { message } = App.useApp();
  const { t, locale } = useTranslation();
  const { items, addItem, updateItem, deleteItem } = useScheduleStore();
  const todayKey = toDateKey(new Date());
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const nextColor = getNextColor(items);
  const [draft, setDraft] = useState(() => createDraft(todayKey, todayKey, nextColor));

  const activeItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [editingItemId, items]
  );
  const monthRange = useMemo(() => getMonthRange(monthDate), [monthDate]);
  const monthItems = useMemo(
    () => items
      .filter((item) => doesItemOverlapRange(item, monthRange.startDate, monthRange.endDate))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt),
    [items, monthRange.endDate, monthRange.startDate]
  );
  const todayItems = useMemo(
    () => items.filter((item) => isItemOnDate(item, todayKey)),
    [items, todayKey]
  );
  const selectedRange = normalizeRange(draft.startDate, draft.endDate);
  const rangeDayCount = getRangeDayCount(selectedRange.startDate, selectedRange.endDate);

  const patchDraft = (updates: Partial<ScheduleDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...updates };
      if (next.startDate && next.endDate && next.endDate < next.startDate) {
        next.endDate = next.startDate;
      }
      return next;
    });
  };

  const resetDraft = (startDate = todayKey, endDate = todayKey) => {
    setEditingItemId(null);
    setDraft(createDraft(startDate, endDate, getNextColor(items)));
    setFocusKey((value) => value + 1);
  };

  const openQuickAdd = (startDate = todayKey, endDate = todayKey) => {
    const range = normalizeRange(startDate, endDate);
    setEditingItemId(null);
    setDraft(createDraft(range.startDate, range.endDate, getNextColor(items)));
    setQuickAddOpen(true);
    setFocusKey((value) => value + 1);
  };

  const selectRange = (startDate: string, endDate: string) => {
    const range = normalizeRange(startDate, endDate);
    setDraft((current) => ({
      ...current,
      startDate: range.startDate,
      endDate: range.endDate,
    }));
  };

  const commitRange = (startDate: string, endDate: string, openEditor = false) => {
    const range = normalizeRange(startDate, endDate);
    setEditingItemId(null);
    if (openEditor) {
      setDraft(createDraft(range.startDate, range.endDate, getNextColor(items)));
      setQuickAddOpen(true);
      setFocusKey((value) => value + 1);
      return;
    }

    setDraft((current) => ({
      ...current,
      title: editingItemId ? '' : current.title,
      notes: editingItemId ? '' : current.notes,
      color: editingItemId ? nextColor : current.color,
      startDate: range.startDate,
      endDate: range.endDate,
    }));
    setFocusKey((value) => value + 1);
  };

  const editItem = (item: ScheduleItem) => {
    setEditingItemId(item.id);
    setDraft({
      title: item.title,
      startDate: item.startDate,
      endDate: item.endDate,
      color: item.color,
      notes: item.notes ?? '',
    });
    setMonthDate(parseDateKey(item.startDate));
    setFocusKey((value) => value + 1);
  };

  const submitDraft = () => {
    const title = draft.title.trim();
    if (!title) return;
    const range = normalizeRange(draft.startDate, draft.endDate);
    const payload = {
      title,
      startDate: range.startDate,
      endDate: range.endDate,
      color: draft.color,
      notes: draft.notes,
    };

    setMonthDate(parseDateKey(range.startDate));
    if (editingItemId) {
      updateItem(editingItemId, payload);
      message.success(t('schedule.saved'));
      return;
    }

    addItem(payload);
    setDraft(createDraft(range.startDate, range.endDate, getNextColor(items, 1)));
    setQuickAddOpen(false);
    setFocusKey((value) => value + 1);
    message.success(t('schedule.added'));
  };

  const removeItem = (id: string) => {
    deleteItem(id);
    if (id === editingItemId) {
      resetDraft(draft.startDate, draft.endDate);
    }
    message.success(t('schedule.deleted'));
  };

  return (
    <section className={`schedule-page${active ? ' is-active' : ''}`}>
      <header className="schedule-header">
        <div className="schedule-title-wrap">
          <span className="schedule-title-line">
            <CalendarOutlined />
            <h1 className="schedule-title">{t('schedule.title')}</h1>
          </span>
          <p className="schedule-subtitle">{t('schedule.subtitle')}</p>
        </div>

        <div className="schedule-toolbar">
          <Button icon={<LeftOutlined />} onClick={() => setMonthDate((date) => addMonths(date, -1))} />
          <Button onClick={() => setMonthDate(new Date())}>{t('schedule.thisMonth')}</Button>
          <Button icon={<RightOutlined />} onClick={() => setMonthDate((date) => addMonths(date, 1))} />
          <Button icon={<PlusOutlined />} type="primary" onClick={() => openQuickAdd(todayKey, todayKey)}>
            {t('schedule.newItem')}
          </Button>
        </div>
      </header>

      <main className="schedule-body">
        <section className="schedule-main">
          <div className="schedule-month-bar">
            <div>
              <h2 className="schedule-month-title">{getMonthTitle(monthDate, locale)}</h2>
              <span className="schedule-month-meta">
                {t('schedule.monthOverview')
                  .replace('{items}', `${monthItems.length}`)
                  .replace('{today}', `${todayItems.length}`)}
              </span>
            </div>
            <div className="schedule-stats">
              <Statistic title={t('schedule.monthItemCount')} value={monthItems.length} />
              <Statistic title={t('schedule.todayItemCount')} value={todayItems.length} />
            </div>
          </div>

          <ScheduleCalendar
            activeItemId={editingItemId}
            items={items}
            locale={locale}
            monthDate={monthDate}
            onItemClick={editItem}
            onRangeCommit={commitRange}
            onRangePreview={selectRange}
            selectedEndDate={selectedRange.endDate}
            selectedStartDate={selectedRange.startDate}
            t={t}
          />
        </section>

        <aside className="schedule-side-panel">
          <ScheduleEditor
            draft={draft}
            editing={Boolean(activeItem)}
            focusKey={focusKey}
            onCancelEdit={() => resetDraft(draft.startDate, draft.endDate)}
            onChange={patchDraft}
            onDelete={() => editingItemId && removeItem(editingItemId)}
            onSubmit={submitDraft}
            palette={SCHEDULE_COLORS}
            rangeDayCount={rangeDayCount}
            t={t}
          />
          <ScheduleWorkList
            activeItemId={editingItemId}
            items={monthItems}
            locale={locale}
            onDelete={removeItem}
            onSelect={editItem}
            t={t}
          />
        </aside>
      </main>

      <Modal
        className="schedule-quick-add-modal"
        centered
        footer={null}
        onCancel={() => setQuickAddOpen(false)}
        open={quickAddOpen}
        title={null}
        width={420}
        destroyOnHidden
      >
        <ScheduleEditor
          draft={draft}
          editing={false}
          focusKey={focusKey}
          onCancelEdit={() => setQuickAddOpen(false)}
          onChange={patchDraft}
          onDelete={() => {}}
          onSubmit={submitDraft}
          palette={SCHEDULE_COLORS}
          rangeDayCount={rangeDayCount}
          t={t}
        />
      </Modal>
    </section>
  );
};

export default SchedulePage;
