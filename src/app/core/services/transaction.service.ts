import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionType;
  amount: string | number;
  category: string | null;
  note: string | null;
  date: string;
  created_at: string;
}

interface TransactionResponse  { success: boolean; data: Transaction;   message?: string; }
interface TransactionsResponse { success: boolean; data: Transaction[]; message?: string; }

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<TransactionsResponse>('/api/transactions');
  }

  create(payload: { type: TransactionType; amount: number; category?: string; note?: string; date: string }) {
    return this.http.post<TransactionResponse>('/api/transactions', payload);
  }

  update(id: number, payload: { type?: TransactionType; amount?: number; category?: string; note?: string; date?: string }) {
    return this.http.put<TransactionResponse>(`/api/transactions/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/transactions/${id}`);
  }
}
