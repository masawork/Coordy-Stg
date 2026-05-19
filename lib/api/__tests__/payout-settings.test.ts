import { NextRequest, NextResponse } from 'next/server';

const mockGetAuthInstructor = jest.fn();
const mockInstructorUpdate = jest.fn();

jest.mock('@/lib/api/auth', () => ({
  getAuthInstructor: () => mockGetAuthInstructor(),
  isErrorResponse: (result: unknown) => result instanceof NextResponse,
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    instructor: {
      update: (...args: any[]) => mockInstructorUpdate(...args),
    },
  },
}));

import { GET, PUT } from '@/app/api/instructor/payout-settings/route';

function makePutRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/instructor/payout-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new NextRequest('http://localhost:3000/api/instructor/payout-settings');
}

async function parseResponse(res: NextResponse) {
  const body = await res.json();
  return { body, status: res.status };
}

describe('GET /api/instructor/payout-settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 if not authenticated', async () => {
    mockGetAuthInstructor.mockResolvedValue(
      NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, { status: 401 })
    );

    const res = await GET(makeGetRequest());
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it('should return payout settings with fee schedule', async () => {
    mockGetAuthInstructor.mockResolvedValue({
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
      dbUser: { id: 'u1', role: 'INSTRUCTOR' },
    });

    const res = await GET(makeGetRequest());
    const { body, status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.payoutFrequency).toBe('IMMEDIATE');
    expect(body.fees.IMMEDIATE).toBe(250);
    expect(body.fees.MONTHLY).toBe(150);
    expect(body.monthlySchedule.cutoffDay).toBe('月末');
    expect(body.monthlySchedule.payoutDay).toBe('翌月15日');
  });

  it('should return 404 if no instructor account', async () => {
    mockGetAuthInstructor.mockResolvedValue(
      NextResponse.json({ error: { code: 'NOT_FOUND', message: 'サービス提供者情報が見つかりません' } }, { status: 404 })
    );

    const res = await GET(makeGetRequest());
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });
});

describe('PUT /api/instructor/payout-settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should update to MONTHLY', async () => {
    mockGetAuthInstructor.mockResolvedValue({
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
      dbUser: { id: 'u1', role: 'INSTRUCTOR' },
    });
    mockInstructorUpdate.mockResolvedValue({ payoutFrequency: 'MONTHLY' });

    const res = await PUT(makePutRequest({ payoutFrequency: 'MONTHLY' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.payoutFrequency).toBe('MONTHLY');
    expect(body.message).toContain('更新');
  });

  it('should reject invalid payoutFrequency', async () => {
    mockGetAuthInstructor.mockResolvedValue({
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
      dbUser: { id: 'u1', role: 'INSTRUCTOR' },
    });

    const res = await PUT(makePutRequest({ payoutFrequency: 'WEEKLY' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('IMMEDIATE');
  });
});
