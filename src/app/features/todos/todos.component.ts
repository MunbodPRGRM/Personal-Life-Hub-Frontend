import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TodoService, Todo } from '../../core/services/todo.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-todos',
  imports: [ReactiveFormsModule],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.scss'
})
export class TodosComponent implements OnInit {
  private todoService = inject(TodoService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  todos = signal<Todo[]>([]);
  loading = signal(true);
  adding = signal(false);
  error = signal('');

  pending = computed(() => this.todos().filter(t => !t.is_done));
  done    = computed(() => this.todos().filter(t => t.is_done));

  form = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    due_date:    [''],
    priority:    ['medium']
  });

  ngOnInit() {
    this.loadTodos();
  }

  loadTodos() {
    this.loading.set(true);
    this.todoService.getAll().subscribe({
      next: res => { this.todos.set(res.data); this.loading.set(false); },
      error: ()  => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  addTodo() {
    if (this.form.invalid || this.adding()) {
      this.form.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');

    const { title, description, due_date, priority } = this.form.value;
    const payload: { title: string; description?: string; due_date?: string; priority?: string } = { title: title! };
    if (description) payload.description = description;
    if (due_date)    payload.due_date    = due_date;
    if (priority)    payload.priority    = priority;

    this.todoService.create(payload).subscribe({
      next: res => {
        this.todos.update(list => [res.data, ...list]);
        this.form.reset({ priority: 'medium' });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'เพิ่ม todo ล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  toggleDone(todo: Todo) {
    this.todoService.update(todo.id, { is_done: !todo.is_done }).subscribe({
      next: res => this.todos.update(list => list.map(t => t.id === todo.id ? res.data : t)),
      error: ()  => this.loadTodos()
    });
  }

  deleteTodo(id: number) {
    this.todoService.remove(id).subscribe({
      next: () => this.todos.update(list => list.filter(t => t.id !== id)),
      error: ()  => this.loadTodos()
    });
  }

  logout() {
    this.auth.logout();
  }

  priorityLabel(p: string) {
    return { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' }[p] ?? p;
  }

  formatDate(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isOverdue(todo: Todo) {
    if (!todo.due_date || todo.is_done) return false;
    return new Date(todo.due_date) < new Date(new Date().toDateString());
  }
}
