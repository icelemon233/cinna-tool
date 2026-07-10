import React, { useMemo, useState } from 'react';
import {
  App,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ChatSkill } from '@/shared/store/chatStore';
import { useTranslation } from '@/shared/i18n';
import './ChatSkillsPanel.css';

interface SkillFormValues {
  name: string;
  description: string;
  instructions: string;
}

interface ChatSkillsPanelProps {
  open: boolean;
  skills: ChatSkill[];
  onClose: () => void;
  onAdd: (skill: SkillFormValues) => void;
  onUpdate: (id: string, skill: SkillFormValues) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

function formatSkillTime(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
}

const ChatSkillsPanel: React.FC<ChatSkillsPanelProps> = ({
  open,
  skills,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
}) => {
  const [form] = Form.useForm<SkillFormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { message } = App.useApp();
  const { t } = useTranslation();

  const enabledSkills = useMemo(() => skills.filter((skill) => skill.enabled), [skills]);
  const editingSkill = useMemo(
    () => skills.find((skill) => skill.id === editingId),
    [editingId, skills]
  );

  const startCreate = () => {
    setEditingId(null);
    setFormOpen(true);
    form.resetFields();
  };

  const startEdit = (skill: ChatSkill) => {
    setEditingId(skill.id);
    setFormOpen(true);
    form.setFieldsValue({
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
    });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleFinish = (values: SkillFormValues) => {
    if (editingSkill) {
      onUpdate(editingSkill.id, values);
      message.success(t('chat.skills.updated'));
    } else {
      onAdd(values);
      message.success(t('chat.skills.added'));
    }
    closeForm();
  };

  return (
    <Drawer
      rootClassName="chat-skills-drawer"
      title={t('chat.skills.title')}
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
    >
      <div className="chat-skills-summary">
        <Space orientation="vertical" size={4}>
          <Typography.Text strong>{t('chat.skills.active')}</Typography.Text>
          <Typography.Text type="secondary">
            {t('chat.skills.activeDesc').replace('{count}', String(enabledSkills.length))}
          </Typography.Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>
          {t('chat.skills.add')}
        </Button>
      </div>

      {enabledSkills.length > 0 && (
        <Space className="chat-skills-active-tags" size={[6, 6]} wrap>
          {enabledSkills.map((skill) => (
            <Tag key={skill.id} color="processing" icon={<ExperimentOutlined />}>
              {skill.name}
            </Tag>
          ))}
        </Space>
      )}

      {formOpen && (
        <div className="chat-skills-form">
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              name="name"
              label={t('chat.skills.name')}
              rules={[{ required: true, message: t('chat.skills.nameRequired') }]}
            >
              <Input placeholder={t('chat.skills.namePlaceholder')} />
            </Form.Item>
            <Form.Item name="description" label={t('chat.skills.description')}>
              <Input placeholder={t('chat.skills.descriptionPlaceholder')} />
            </Form.Item>
            <Form.Item
              name="instructions"
              label={t('chat.skills.instructions')}
              rules={[{ required: true, message: t('chat.skills.instructionsRequired') }]}
            >
              <Input.TextArea
                placeholder={t('chat.skills.instructionsPlaceholder')}
                autoSize={{ minRows: 5, maxRows: 10 }}
              />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSkill ? t('chat.skills.save') : t('chat.skills.create')}
              </Button>
              <Button onClick={closeForm}>{t('chat.skills.cancel')}</Button>
            </Space>
          </Form>
        </div>
      )}

      {skills.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('chat.skills.empty')}
        />
      ) : (
        <div className="chat-skills-list">
          {skills.map((skill) => (
            <div className="chat-skill-item" key={skill.id}>
              <div className="chat-skill-main">
                <div className="chat-skill-title">
                  <ExperimentOutlined />
                  <Typography.Text className="chat-skill-name" strong title={skill.name}>
                    {skill.name}
                  </Typography.Text>
                  <Tag color={skill.enabled ? 'success' : 'default'}>
                    {skill.enabled ? t('chat.skills.enabled') : t('chat.skills.disabled')}
                  </Tag>
                </div>
                <Typography.Paragraph
                  className="chat-skill-description"
                  type="secondary"
                >
                  {skill.description || skill.instructions}
                </Typography.Paragraph>
                <div className="chat-skill-meta">
                  <Tag>
                    {t('chat.skills.usedCount').replace('{count}', String(skill.usageCount))}
                  </Tag>
                  {skill.lastUsedAt && (
                    <Tag>
                      {t('chat.skills.lastUsed').replace(
                        '{time}',
                        formatSkillTime(skill.lastUsedAt)
                      )}
                    </Tag>
                  )}
                </div>
              </div>
              <div className="chat-skill-actions">
                <Switch
                  size="small"
                  checked={skill.enabled}
                  onChange={(checked) => onToggle(skill.id, checked)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => startEdit(skill)}
                />
                <Popconfirm
                  title={t('chat.skills.deleteConfirm')}
                  okText={t('chat.skills.delete')}
                  cancelText={t('chat.skills.cancel')}
                  onConfirm={() => onDelete(skill.id)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default ChatSkillsPanel;
