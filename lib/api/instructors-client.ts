export interface InstructorProfile {
  id: string;
  userId: string;
  bio?: string | null;
  specialties: string[];
  hourlyRate?: number | null;
  isVerified: boolean;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
}

export type InstructorPayload = {
  bio?: string;
  specialties?: string[];
  hourlyRate?: number | null;
  isVerified?: boolean;
};

type InstructorResponse = {
  instructor: InstructorProfile | null;
  error?: string;
  details?: string;
};

const parseJson = async (res: Response): Promise<InstructorResponse | null> => {
  try {
    const data: InstructorResponse | null = await res.json();
    return data;
  } catch {
    return null;
  }
};

export async function fetchCurrentInstructor(): Promise<InstructorProfile | null> {
  const res = await fetch('/api/instructor/profile', { credentials: 'include' });
  if (!res.ok) {
    return null;
  }
  const data: InstructorResponse | null = await parseJson(res);
  return data?.instructor ?? null;
}

export async function saveInstructor(payload: InstructorPayload): Promise<InstructorProfile | null> {
  const res = await fetch('/api/instructor/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data: InstructorResponse | null = await parseJson(res);
  if (!res.ok) {
    throw new Error(data?.error || 'サービス提供者情報の保存に失敗しました');
  }

  return data?.instructor ?? null;
}
