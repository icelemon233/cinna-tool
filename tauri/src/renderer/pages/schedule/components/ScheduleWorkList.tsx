import React from 'react';
import { Button, Empty } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ScheduleItem } from '@/shared/store/scheduleStore';
import { formatDateRange } from '../utils/date';

interface ScheduleWorkListProps {
  activeItemId: string | null;
  items: ScheduleItem[];
  locale: 'zh' | 'en';
  onDelete: (id: string) => void;
  onSelect: (item: ScheduleItem) => void;
  t: (key: string) => string;
}

export function ScheduleWorkList({
  activeItemId,
  items,
  locale,
  onDelete,
  onSelect,
  t,
}: ScheduleWorkListProps) {
  return (
    <section className="schedule-work-list">
      <div className="schedule-panel-title-row">
        <div>
          <h2 className="schedule-panel-title">{t('schedule.monthWorks')}</h2>
          <span className="schedule-panel-meta">
            {t('schedule.itemCount').replace('{count}', `${items.length}`)}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('schedule.emptyMonth')} />
      ) : (
        <div className="schedule-work-list-body">
          {items.map((item) => (
            <div
              className={`schedule-work-row${item.id === activeItemId ? ' is-active' : ''}`}
              key={item.id}
              style={{ '--schedule-item-color': item.color } as React.CSSProperties}
            >
              <button
                className="schedule-work-main"
                onClick={() => onSelect(item)}
                type="button"
              >
                <span className="schedule-work-dot" />
                <span className="schedule-work-text">
                  <span className="schedule-work-title" title={item.title}>
                    {item.title}
                  </span>
                  <span className="schedule-work-date">
                    {formatDateRange(item.startDate, item.endDate, locale)}
                  </span>
                </span>
              </button>
              <Button
                aria-label={t('schedule.delete')}
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(item.id)}
                size="small"
                type="text"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
