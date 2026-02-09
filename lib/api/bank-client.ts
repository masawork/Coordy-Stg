// lib/api/bank-client.ts

export interface BankAccount {
  id: string;
  userId: string;
  accountType: string;
  bankName: string;
  bankCode: string;
  branchName: string;
  branchCode: string;
  accountNumber?: string; // 復号化済み（編集用）
  accountNumberMasked?: string;
  accountHolderName: string;
  isVerified: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  instructorId: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankAccountId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectedReason?: string | null;
  processedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bankAccount?: {
    bankName: string;
    branchName: string;
    accountHolderName: string;
  };
}

/**
 * 銀行口座一覧を取得
 */
export async function getBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/bank-accounts', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '銀行口座情報の取得に失敗しました');
  }

  return await response.json();
}

/**
 * 銀行口座を登録
 */
export async function createBankAccount(data: {
  accountType: string;
  bankName: string;
  bankCode: string;
  branchName: string;
  branchCode: string;
  accountNumber: string;
  accountHolderName: string;
}): Promise<BankAccount> {
  const response = await fetch('/api/bank-accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const message = error.error || '銀行口座の登録に失敗しました';
    const details = error.details ? ` (${error.details})` : '';
    throw new Error(message + details);
  }

  return await response.json();
}

/**
 * 銀行口座を更新
 */
export async function updateBankAccount(
  id: string,
  data: {
    accountType: string;
    bankName: string;
    bankCode: string;
    branchName: string;
    branchCode: string;
    accountNumber: string;
    accountHolderName: string;
  }
): Promise<BankAccount> {
  const response = await fetch(`/api/bank-accounts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const message = error.error || '銀行口座の更新に失敗しました';
    const details = error.details ? ` (${error.details})` : '';
    throw new Error(message + details);
  }

  return await response.json();
}

/**
 * 銀行口座を削除
 */
export async function deleteBankAccount(id: string): Promise<void> {
  const response = await fetch(`/api/bank-accounts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '銀行口座の削除に失敗しました');
  }
}

/**
 * 引き出し申請一覧を取得
 */
export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const response = await fetch('/api/withdrawals', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '引き出し申請の取得に失敗しました');
  }

  return await response.json();
}

/**
 * 引き出し申請を作成
 */
export async function createWithdrawalRequest(
  amount: number,
  bankAccountId: string
): Promise<WithdrawalRequest> {
  const response = await fetch('/api/withdrawals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, bankAccountId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '引き出し申請の作成に失敗しました');
  }

  return await response.json();
}
