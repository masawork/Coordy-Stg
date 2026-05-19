import { NextRequest, NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockUserFindUnique = jest.fn();
const mockInstructorUpdate = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
    },
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
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });

    const res = await GET(makeGetRequest());
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it('should return payout settings with fee schedule', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'i@test.com' } },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
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
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'u@test.com' } },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue({ id: 'u1', instructor: null });

    const res = await GET(makeGetRequest());
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });
});

describe('PUT /api/instructor/payout-settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should update to MONTHLY', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'i@test.com' } },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
    });
    mockInstructorUpdate.mockResolvedValue({ payoutFrequency: 'MONTHLY' });

    const res = await PUT(makePutRequest({ payoutFrequency: 'MONTHLY' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.payoutFrequency).toBe('MONTHLY');
    expect(body.message).toContain('更新');
  });

  it('should reject invalid payoutFrequency', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1', email: 'i@test.com' } },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      instructor: { id: 'inst-1', payoutFrequency: 'IMMEDIATE' },
    });

    const res = await PUT(makePutRequest({ payoutFrequency: 'WEEKLY' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('IMMEDIATE');
  });
});
