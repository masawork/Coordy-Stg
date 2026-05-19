export async function getBlockedInstructors() {
  const response = await fetch('/api/blocks', {
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'ブロック一覧の取得に失敗しました');
  }
  return response.json();
}

export async function blockInstructor(instructorId: string, reason?: string) {
  const response = await fetch('/api/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ instructorId, reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'ブロックに失敗しました');
  }
  return response.json();
}

export async function unblockInstructor(blockId: string) {
  const response = await fetch(`/api/blocks/${blockId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'ブロック解除に失敗しました');
  }
  return response.json();
}
