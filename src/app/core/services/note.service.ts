import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  tags: 'work' | 'personal' | 'study' | 'other';
  created_at: string;
  updated_at: string;
}

interface NoteResponse  { success: boolean; data: Note;   message?: string; }
interface NotesResponse { success: boolean; data: Note[]; message?: string; }

@Injectable({ providedIn: 'root' })
export class NoteService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<NotesResponse>('/api/notes');
  }

  create(payload: { title: string; content?: string; tags?: string }) {
    return this.http.post<NoteResponse>('/api/notes', payload);
  }

  update(id: number, payload: { title?: string; content?: string; tags?: string }) {
    return this.http.put<NoteResponse>(`/api/notes/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/notes/${id}`);
  }
}
