import { Button, Tooltip, Typography } from 'antd';
import {
  ExperimentOutlined,
  ReloadOutlined,
  SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons';

interface ChatToolPanelProps {
  balance: string | null;
  enabledSkillCount: number;
  hasBalanceConfig: boolean;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onRefreshBalance: () => void;
  t: (key: string) => string;
}

export function ChatToolPanel({
  balance,
  enabledSkillCount,
  hasBalanceConfig,
  onOpenSettings,
  onOpenSkills,
  onRefreshBalance,
  t,
}: ChatToolPanelProps) {
  return (
    <>
      {hasBalanceConfig && (
        <div className="chat-tool-card" onClick={onRefreshBalance}>
          <WalletOutlined />
          <span className="chat-tool-text">
            <Typography.Text strong>{t('chat.balance')}</Typography.Text>
            <Typography.Text className="chat-tool-meta" type="secondary">
              {t('chat.balanceDesc').replace('{amount}', balance ?? t('chat.balanceLoading'))}
            </Typography.Text>
          </span>
          <Tooltip title={t('chat.refreshBalance')}>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                onRefreshBalance();
              }}
            />
          </Tooltip>
        </div>
      )}
      <div className="chat-tool-card" onClick={onOpenSettings}>
        <SettingOutlined />
        <span className="chat-tool-text">
          <Typography.Text strong>{t('chat.settings')}</Typography.Text>
          <Typography.Text className="chat-tool-meta" type="secondary">
            {t('chat.settingsDescShort')}
          </Typography.Text>
        </span>
      </div>
      <div className="chat-tool-card" onClick={onOpenSkills}>
        <ExperimentOutlined />
        <span className="chat-tool-text">
          <Typography.Text strong>{t('chat.skills.entry')}</Typography.Text>
          <Typography.Text className="chat-tool-meta" type="secondary">
            {t('chat.skills.entryDesc').replace('{count}', String(enabledSkillCount))}
          </Typography.Text>
        </span>
      </div>
    </>
  );
}
