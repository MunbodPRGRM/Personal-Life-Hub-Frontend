import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  is_done: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

interface TodosResponse { success: boolean; data: Todo[]; }
interface TodoResponse  { success: boolean; data: Todo; message?: string; }

@Injectable({ providedIn: 'root' })
export class TodoService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<TodosResponse>('/api/todos');
  }

  create(payload: { title: string; description?: string; due_date?: string; priority?: string }) {
    return this.http.post<TodoResponse>('/api/todos', payload);
  }

  update(id: number, payload: Partial<{ title: string; description: string; is_done: boolean; due_date: string; priority: string }>) {
    return this.http.put<TodoResponse>(`/api/todos/${id}`, payload);
  }

  remove(id: number) {
    return this.http.delete<{ success: boolean; message: string }>(`/api/todos/${id}`);
  }
}
