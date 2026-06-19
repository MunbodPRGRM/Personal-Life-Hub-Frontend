import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CalendarEvent {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  color: string;
  created_at: string;
}

interface EventResponse  { success: boolean; data: CalendarEvent;   message?: string; }
interface EventsResponse { success: boolean; data: CalendarEvent[]; message?: string; }

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<EventsResponse>('/api/events');
  }

  create(payload: { title: string; description?: string; start_datetime: string; end_datetime?: string; color?: string }) {
    return this.http.post<EventResponse>('/api/events', payload);
  }

  update(id: number, payload: { title?: string; description?: string; start_datetime?: string; end_datetime?: string; color?: string }) {
    return this.http.put<EventResponse>(`/api/events/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/events/${id}`);
  }
}
