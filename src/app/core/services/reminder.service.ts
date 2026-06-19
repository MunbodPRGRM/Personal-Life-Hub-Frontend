import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type RefType = 'todo' | 'event' | 'goal';

export interface Reminder {
  id: number;
  user_id: number;
  ref_type: RefType;
  ref_id: number;
  remind_at: string;
  is_sent: number | boolean;
  created_at: string;
  ref_title?: string | null;
}

interface ReminderResponse  { success: boolean; data: Reminder;   message?: string; }
interface RemindersResponse { success: boolean; data: Reminder[]; message?: string; }

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<RemindersResponse>('/api/reminders');
  }

  create(payload: { ref_type: RefType; ref_id: number; remind_at: string }) {
    return this.http.post<ReminderResponse>('/api/reminders', payload);
  }

  update(id: number, payload: { ref_type?: RefType; ref_id?: number; remind_at?: string; is_sent?: boolean }) {
    return this.http.put<ReminderResponse>(`/api/reminders/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/reminders/${id}`);
  }
}
