/**
 * Amplify Data Client
 * GraphQL API経由でDynamoDBにアクセス
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

// Data Client（遅延初期化）
let client: ReturnType<typeof generateClient<Schema>> | null = null;

/**
 * Data Clientを取得（遅延初期化）
 * Amplify.configure() が呼ばれた後に初めて generateClient() を実行する
 */
export function getDataClient() {
  if (!client) {
    console.log('🔧 generateClient() を初期化中...');
    client = generateClient<Schema>();
    console.log('✅ generateClient() 初期化完了');
  }
  return client;
}

/**
 * 型エクスポート
 */
export type User = Schema['User']['type'];
export type Instructor = Schema['Instructor']['type'];
export type Service = Schema['Service']['type'];
export type Reservation = Schema['Reservation']['type'];
export type Todo = Schema['Todo']['type'];

/**
 * Enumの型エクスポート
 */
export type Role = 'user' | 'instructor' | 'admin';
export type Membership = 'free' | 'gold' | 'platinum';
export type ServiceCategory = 'coaching' | 'training' | 'consultation' | 'workshop' | 'seminar' | 'other';
export type ServiceStatus = 'active' | 'inactive' | 'draft';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type InstructorStatus = 'active' | 'inactive' | 'pending';
