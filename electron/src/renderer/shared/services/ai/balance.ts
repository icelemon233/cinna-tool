export interface BalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface BalanceResponse {
  is_available: boolean;
  balance_infos: BalanceInfo[];
}

export async function queryBalance(baseUrl: string, apiKey: string): Promise<BalanceResponse> {
  const url = baseUrl.endsWith('/') ? `${baseUrl}user/balance` : `${baseUrl}/user/balance`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`查询余额失败: HTTP ${res.status}`);
  }
  return res.json();
}
