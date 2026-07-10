import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, type InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTodoStore } from '@/shared/store/todoStore';
import { useTranslation } from '@/shared/i18n';

interface TodoAddBarProps {
  quickCreateKey?: number;
}

const TodoAddBar: React.FC<TodoAddBarProps> = ({ quickCreateKey = 0 }) => {
  const addTodo = useTodoStore((state) => state.addTodo);
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (quickCreateKey <= 0) return;
    setEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [quickCreateKey]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addTodo(trimmed);
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
            placeholder={t('todo.addDefault.placeholder')}
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
