import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  target_date: string | null;
  created_at: string;
}

interface GoalResponse  { success: boolean; data: Goal;   message?: string; }
interface GoalsResponse { success: boolean; data: Goal[]; message?: string; }

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<GoalsResponse>('/api/goals');
  }

  create(payload: { title: string; description?: string; status?: string; progress?: number; target_date?: string }) {
    return this.http.post<GoalResponse>('/api/goals', payload);
  }

  update(id: number, payload: { title?: string; description?: string; status?: string; progress?: number; target_date?: string }) {
    return this.http.put<GoalResponse>(`/api/goals/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/goals/${id}`);
  }
}
