export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          owner_id: string
          name: string
          mobile: string
          start_date: string
          end_date: string
          amount: number
          status: 'paid' | 'unpaid'
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          mobile: string
          start_date: string
          end_date: string
          amount: number
          status: 'paid' | 'unpaid'
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          mobile?: string
          start_date?: string
          end_date?: string
          amount?: number
          status?: 'paid' | 'unpaid'
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          owner_id: string
          customer_id: string
          amount: number
          payment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          customer_id: string
          amount: number
          payment_date: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          customer_id?: string
          amount?: number
          payment_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
