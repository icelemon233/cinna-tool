import { useCallback, useEffect, useState } from 'react';
import { queryBalance, type BalanceResponse } from '@/shared/services/aiService';

export function useChatBalance(apiKey: string, baseUrl: string) {
  const [balance, setBalance] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!apiKey || !baseUrl) return;

    try {
      const res: BalanceResponse = await queryBalance(baseUrl, apiKey);
      if (res.balance_infos && res.balance_infos.length > 0) {
        const info = res.balance_infos[0];
        const symbol = info.currency === 'CNY' ? '¥' : '$';
        setBalance(`${symbol}${parseFloat(info.total_balance).toFixed(2)}`);
      }
    } catch {
      setBalance(null);
    }
  }, [apiKey, baseUrl]);

  useEffect(() => {
    if (apiKey && baseUrl) {
      fetchBalance();
    }
  }, [apiKey, baseUrl, fetchBalance]);

  return { balance, fetchBalance };
}
