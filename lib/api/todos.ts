/**
 * TODO関連のAPI操作
 */

import { getDataClient } from './data-client';
import type { Todo, TodoPriority } from './data-client';

/**
 * TODO一覧取得
 */
export async function listTodos(filters?: {
  userId?: string;
  priority?: TodoPriority;
  isCompleted?: boolean;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Todo.list({
      filter: filters
        ? {
            ...(filters.userId && { userId: { eq: filters.userId } }),
            ...(filters.priority && { priority: { eq: filters.priority } }),
            ...(filters.isCompleted !== undefined && {
              isCompleted: { eq: filters.isCompleted },
            }),
          }
        : undefined,
    });

    if (errors) {
      console.error('Error listing todos:', errors);
      throw new Error('TODO一覧の取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('List todos error:', error);
    throw error;
  }
}

/**
 * TODO詳細取得
 */
export async function getTodo(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Todo.get({ id });

    if (errors) {
      console.error('Error getting todo:', errors);
      throw new Error('TODOの取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Get todo error:', error);
    throw error;
  }
}

/**
 * TODO作成
 */
export async function createTodo(input: {
  userId: string;
  title: string;
  description?: string;
  date?: string;
  priority?: TodoPriority;
  category?: string;
  relatedReservationId?: string;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Todo.create({
      ...input,
      isCompleted: false,
    });

    if (errors) {
      console.error('Error creating todo:', errors);
      throw new Error('TODOの作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Create todo error:', error);
    throw error;
  }
}

/**
 * TODO更新
 */
export async function updateTodo(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    date: string;
    priority: TodoPriority;
    category: string;
    isCompleted: boolean;
  }>
) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Todo.update({
      id,
      ...updates,
    });

    if (errors) {
      console.error('Error updating todo:', errors);
      throw new Error('TODOの更新に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Update todo error:', error);
    throw error;
  }
}

/**
 * TODO完了/未完了トグル
 */
export async function toggleTodoComplete(id: string, isCompleted: boolean) {
  return updateTodo(id, { isCompleted });
}

/**
 * TODO削除
 */
export async function deleteTodo(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Todo.delete({ id });

    if (errors) {
      console.error('Error deleting todo:', errors);
      throw new Error('TODOの削除に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Delete todo error:', error);
    throw error;
  }
}
