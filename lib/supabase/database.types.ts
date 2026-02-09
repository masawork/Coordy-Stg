// このファイルは `npm run db:generate` で自動生成されます
// Supabaseのスキーマから型定義を生成

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // テーブル定義は後で追加
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'user' | 'instructor' | 'admin';
      reservation_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
      transaction_type: 'charge' | 'use' | 'expired';
      transaction_status: 'pending' | 'completed' | 'failed';
    };
  };
}

