export type InstructorPayload = {
  bio?: string;
  specialties?: string[];
  hourlyRate?: number | null;
  isVerified?: boolean;
};

type InstructorResponse = {
  instructor: any | null;
  error?: string;
  details?: string;
};

const parseJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export async function fetchCurrentInstructor(): Promise<any | null> {
  const res = await fetch('/api/instructor/profile', { credentials: 'include' });
  if (!res.ok) {
    return null;
  }
  const data: InstructorResponse = await parseJson(res);
  return data?.instructor ?? null;
}

export async function saveInstructor(payload: InstructorPayload): Promise<any> {
  const res = await fetch('/api/instructor/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data: InstructorResponse = await parseJson(res);
  if (!res.ok) {
    throw new Error(data?.error || 'インストラクター情報の保存に失敗しました');
  }

  return data?.instructor;
}
