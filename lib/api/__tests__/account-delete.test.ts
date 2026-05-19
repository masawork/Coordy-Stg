import { NextRequest, NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  }),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: (...args: any[]) => mockFindMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

import { POST } from '@/app/api/account/delete/route';

function makeRequest(body: any) {
  return new NextRequest('http://localhost:3000/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseResponse(res: NextResponse) {
  const body = await res.json();
  return { body, status: res.status };
}

describe('POST /api/account/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') });

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it('should require confirmation = "DELETE"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });

    const res = await POST(makeRequest({ confirmation: 'wrong' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('DELETE');
  });

  it('should reject if pending reservations exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });
    mockFindMany.mockResolvedValue([
      {
        id: 'u1',
        reservations: [{ id: 'r1', status: 'CONFIRMED' }],
        withdrawalRequests: [],
        wallet: { balance: 0 },
        instructor: null,
      },
    ]);

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('予約');
  });

  it('should reject if pending withdrawals exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });
    mockFindMany.mockResolvedValue([
      {
        id: 'u1',
        reservations: [],
        withdrawalRequests: [{ id: 'w1', status: 'PENDING' }],
        wallet: { balance: 0 },
        instructor: null,
      },
    ]);

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('出金');
  });

  it('should reject if wallet has balance', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });
    mockFindMany.mockResolvedValue([
      {
        id: 'u1',
        reservations: [],
        withdrawalRequests: [],
        wallet: { balance: 500 },
        instructor: null,
      },
    ]);

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error.message).toContain('500');
  });

  it('should soft-delete user when all checks pass', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });
    mockFindMany.mockResolvedValue([
      {
        id: 'u1',
        reservations: [],
        withdrawalRequests: [],
        wallet: { balance: 0 },
        instructor: null,
      },
    ]);
    mockTransaction.mockResolvedValue([{ id: 'u1' }]);
    mockSignOut.mockResolvedValue({});

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('退会');
  });

  it('should handle multiple user records (multi-role)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@b.com' } }, error: null });
    mockFindMany.mockResolvedValue([
      {
        id: 'u1',
        reservations: [],
        withdrawalRequests: [],
        wallet: { balance: 0 },
        instructor: null,
      },
      {
        id: 'u2',
        reservations: [],
        withdrawalRequests: [],
        wallet: null,
        instructor: null,
      },
    ]);
    mockTransaction.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    mockSignOut.mockResolvedValue({});

    const res = await POST(makeRequest({ confirmation: 'DELETE' }));
    const { body, status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
