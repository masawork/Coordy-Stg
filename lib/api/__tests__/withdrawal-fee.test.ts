describe('Withdrawal fee calculation by payout frequency', () => {
  const TRANSFER_FEE_IMMEDIATE = 250;
  const TRANSFER_FEE_MONTHLY = 150;

  function calculateFee(payoutFrequency: 'IMMEDIATE' | 'MONTHLY'): number {
    return payoutFrequency === 'MONTHLY' ? TRANSFER_FEE_MONTHLY : TRANSFER_FEE_IMMEDIATE;
  }

  function calculateNet(amount: number, payoutFrequency: 'IMMEDIATE' | 'MONTHLY'): number {
    return amount - calculateFee(payoutFrequency);
  }

  it('should charge ¥250 for IMMEDIATE payout', () => {
    expect(calculateFee('IMMEDIATE')).toBe(250);
  });

  it('should charge ¥150 for MONTHLY payout', () => {
    expect(calculateFee('MONTHLY')).toBe(150);
  });

  it('should calculate correct net for IMMEDIATE ¥10,000 withdrawal', () => {
    expect(calculateNet(10000, 'IMMEDIATE')).toBe(9750);
  });

  it('should calculate correct net for MONTHLY ¥10,000 withdrawal', () => {
    expect(calculateNet(10000, 'MONTHLY')).toBe(9850);
  });

  it('should save ¥100 per withdrawal with MONTHLY vs IMMEDIATE', () => {
    const savingsPerWithdrawal = calculateFee('IMMEDIATE') - calculateFee('MONTHLY');
    expect(savingsPerWithdrawal).toBe(100);
  });

  it('should handle minimum withdrawal amount (¥1,000)', () => {
    const minAmount = 1000;
    const netImmediate = calculateNet(minAmount, 'IMMEDIATE');
    const netMonthly = calculateNet(minAmount, 'MONTHLY');
    expect(netImmediate).toBe(750);
    expect(netMonthly).toBe(850);
    expect(netImmediate).toBeGreaterThan(0);
    expect(netMonthly).toBeGreaterThan(0);
  });
});
