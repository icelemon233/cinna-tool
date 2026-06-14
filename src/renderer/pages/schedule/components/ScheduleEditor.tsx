import React, { useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Button, ColorPicker, DatePicker, Form, Input, Space, Tooltip } from 'antd';
import type { InputRef } from 'antd/es/input';
import {
  CloseCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { ScheduleDraft } from '../types';

const DATE_KEY_FORMAT = 'YYYY-MM-DD';
const DATE_DISPLAY_FORMAT = 'YYYY/MM/DD';

interface ScheduleEditorProps {
  draft: ScheduleDraft;
  editing: boolean;
  focusKey: number;
  palette: string[];
  rangeDayCount: number;
  onCancelEdit: () => void;
  onChange: (updates: Partial<ScheduleDraft>) => void;
  onDelete: () => void;
  onSubmit: () => void;
  t: (key: string) => string;
}

export function ScheduleEditor({
  draft,
  editing,
  focusKey,
  palette,
  rangeDayCount,
  onCancelEdit,
  onChange,
  onDelete,
  onSubmit,
  t,
}: ScheduleEditorProps) {
  const titleInputRef = useRef<InputRef>(null);
  const canSubmit = Boolean(draft.title.trim() && draft.startDate && draft.endDate);
  const colorPresets = [
    {
      label: t('schedule.color'),
      colors: palette,
    },
  ];

  useEffect(() => {
    titleInputRef.current?.focus({ cursor: 'end' });
  }, [focusKey]);

  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    if (!date) return;

    const startDate = date.format(DATE_KEY_FORMAT);
    const updates: Partial<ScheduleDraft> = { startDate };
    if (!draft.endDate || draft.endDate < startDate) {
      updates.endDate = startDate;
    }
    onChange(updates);
  };

  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    if (!date) return;

    const nextEndDate = date.format(DATE_KEY_FORMAT);
    onChange({
      endDate: draft.startDate && nextEndDate < draft.startDate
        ? draft.startDate
        : nextEndDate,
    });
  };

  return (
    <section className="schedule-editor">
      <Form
        className="schedule-editor-form"
        layout="vertical"
        onFinish={() => {
          if (canSubmit) onSubmit();
        }}
      >
        <div className="schedule-panel-title-row">
          <div>
            <h2 className="schedule-panel-title">
              {editing ? t('schedule.editTitle') : t('schedule.quickAdd')}
            </h2>
            <span className="schedule-panel-meta">
              {t('schedule.rangeDays').replace('{count}', `${rangeDayCount}`)}
            </span>
          </div>
          {editing && (
            <Button
              aria-label={t('schedule.cancelEdit')}
              icon={<CloseCircleOutlined />}
              onClick={onCancelEdit}
            />
          )}
        </div>

        <Form.Item className="schedule-form-item" label={t('schedule.workTitle')}>
          <Input
            ref={titleInputRef}
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t('schedule.workTitlePlaceholder')}
          />
        </Form.Item>

        <div className="schedule-date-row">
          <Form.Item className="schedule-form-item" label={t('schedule.startDate')}>
            <DatePicker
              allowClear={false}
              format={DATE_DISPLAY_FORMAT}
              inputReadOnly
              value={draft.startDate ? dayjs(draft.startDate) : null}
              onChange={handleStartDateChange}
            />
          </Form.Item>
          <Form.Item className="schedule-form-item" label={t('schedule.endDate')}>
            <DatePicker
              allowClear={false}
              format={DATE_DISPLAY_FORMAT}
              inputReadOnly
              value={draft.endDate ? dayjs(draft.endDate) : null}
              disabledDate={(date) => Boolean(
                draft.startDate && date?.isBefore(dayjs(draft.startDate), 'day')
              )}
              onChange={handleEndDateChange}
            />
          </Form.Item>
        </div>

        {editing && (
          <Form.Item className="schedule-form-item" label={t('schedule.color')}>
            <Space className="schedule-color-grid" size={[10, 10]} wrap>
              <ColorPicker
                format="hex"
                presets={colorPresets}
                showText
                value={draft.color}
                onChange={(_color, css) => onChange({ color: css })}
              />
              {palette.map((color, index) => (
                <Tooltip key={color} title={color}>
                  <Button
                    aria-label={`${t('schedule.color')} ${index + 1}`}
                    className={`schedule-color-swatch${draft.color === color ? ' is-active' : ''}`}
                    onClick={() => onChange({ color })}
                    style={{ '--schedule-item-color': color } as React.CSSProperties}
                    type="text"
                  />
                </Tooltip>
              ))}
            </Space>
          </Form.Item>
        )}

        <Form.Item className="schedule-form-item" label={t('schedule.notes')}>
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={draft.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder={t('schedule.notesPlaceholder')}
          />
        </Form.Item>

        <div className="schedule-editor-actions">
          <Button
            htmlType="submit"
            icon={editing ? <SaveOutlined /> : <PlusOutlined />}
            type="primary"
            disabled={!canSubmit}
          >
            {editing ? t('schedule.save') : t('schedule.add')}
          </Button>
          {editing && (
            <Button danger icon={<DeleteOutlined />} onClick={onDelete}>
              {t('schedule.delete')}
            </Button>
          )}
        </div>
      </Form>
    </section>
  );
}
