import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, type InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';

const TodoAddBar: React.FC = () => {
  const { currentView, currentListId, addTodo } = useTodoStore();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const options: {
      myDay?: boolean;
      important?: boolean;
      dueDate?: number;
      listId?: string;
    } = {};

    switch (currentView) {
      case 'my-day':
        options.myDay = true;
        break;
      case 'important':
        options.important = true;
        break;
      case 'planned': {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        options.dueDate = today.getTime();
        break;
      }
      case 'list':
        if (currentListId) {
          options.listId = currentListId;
        }
        break;
      case 'tasks':
      default:
        break;
    }

    addTodo(trimmed, options);
    setText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
    if (event.key === 'Escape') {
      setEditing(false);
      setText('');
    }
  };

  const getPlaceholder = (): string => {
    switch (currentView) {
      case 'my-day':
        return t('todo.addToMyDay.placeholder');
      case 'important':
        return t('todo.addImportant.placeholder');
      case 'planned':
        return t('todo.addPlanned.placeholder');
      case 'list':
        return t('todo.addToList.placeholder');
      default:
        return t('todo.addDefault.placeholder');
    }
  };

  return (
    <div className="todo-add-bar">
      {!editing ? (
        <Button
          className="todo-add-button"
          block
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setEditing(true)}
        >
          {t('todo.addTask')}
        </Button>
      ) : (
        <div className="todo-add-surface">
          <Input
            ref={inputRef}
            variant="borderless"
            prefix={<PlusOutlined className="todo-add-icon" />}
            placeholder={getPlaceholder()}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!text.trim()) {
                setEditing(false);
              }
            }}
          />
          <Space>
            <Button
              type="primary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleSubmit}
              disabled={!text.trim()}
            >
              {t('todo.add')}
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default TodoAddBar;
