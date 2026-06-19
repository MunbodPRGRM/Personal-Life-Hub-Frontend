import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GoalService, Goal } from '../../core/services/goal.service';
import { AuthService } from '../../core/services/auth.service';

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-goals',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss'
})
export class GoalsComponent implements OnInit {
  private goalService = inject(GoalService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  goals     = signal<Goal[]>([]);
  loading   = signal(true);
  adding    = signal(false);
  error     = signal('');
  filter    = signal<StatusFilter>('all');
  editingId = signal<number | null>(null);

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.goals() : this.goals().filter(g => g.status === f);
  });

  summary = computed(() => ({
    total:     this.goals().length,
    active:    this.goals().filter(g => g.status === 'active').length,
    completed: this.goals().filter(g => g.status === 'completed').length,
    cancelled: this.goals().filter(g => g.status === 'cancelled').length,
  }));

  addForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    target_date: [''],
    status:      ['active'],
    progress:    [0]
  });

  editForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    target_date: [''],
    status:      ['active'],
    progress:    [0]
  });

  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all',       label: 'ทั้งหมด' },
    { value: 'active',    label: 'กำลังทำ' },
    { value: 'completed', label: 'สำเร็จแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  ngOnInit() {
    this.goalService.getAll().subscribe({
      next: res => { this.goals.set(res.data); this.loading.set(false); },
      error: ()  => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  addGoal() {
    if (this.addForm.invalid || this.adding()) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');
    const v = this.addForm.value;

    this.goalService.create({
      title:       v.title!,
      description: v.description || undefined,
      status:      v.status || undefined,
      progress:    v.progress ?? 0,
      target_date: v.target_date || undefined,
    }).subscribe({
      next: res => {
        this.goals.update(list => [res.data, ...list]);
        this.addForm.reset({ status: 'active', progress: 0 });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'เพิ่ม goal ล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  startEdit(goal: Goal) {
    this.editingId.set(goal.id);
    this.editForm.setValue({
      title:       goal.title,
      description: goal.description ?? '',
      target_date: goal.target_date ? goal.target_date.split('T')[0] : '',
      status:      goal.status,
      progress:    goal.progress,
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(goal: Goal) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.goalService.update(goal.id, {
      title:       v.title!,
      description: v.description || undefined,
      status:      v.status || undefined,
      progress:    v.progress ?? undefined,
      target_date: v.target_date || undefined,
    }).subscribe({
      next: res => {
        this.goals.update(list => list.map(g => g.id === goal.id ? res.data : g));
        this.editingId.set(null);
      },
      error: () => this.error.set('แก้ไข goal ล้มเหลว')
    });
  }

  quickProgress(goal: Goal, value: number) {
    const progress = Math.min(100, Math.max(0, value));
    const status = progress === 100 ? 'completed' : goal.status === 'completed' ? 'active' : goal.status;
    this.goalService.update(goal.id, { progress, status }).subscribe({
      next: res => this.goals.update(list => list.map(g => g.id === goal.id ? res.data : g)),
      error: () => this.error.set('อัปเดต progress ล้มเหลว')
    });
  }

  deleteGoal(id: number) {
    this.goalService.remove(id).subscribe({
      next: () => {
        this.goals.update(list => list.filter(g => g.id !== id));
        if (this.editingId() === id) this.editingId.set(null);
      },
      error: () => this.error.set('ลบ goal ล้มเหลว')
    });
  }

  setFilter(s: StatusFilter) { this.filter.set(s); }

  logout() { this.auth.logout(); }

  statusLabel(s: string) {
    return { active: 'กำลังทำ', completed: 'สำเร็จแล้ว', cancelled: 'ยกเลิก' }[s] ?? s;
  }

  formatDate(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isOverdue(goal: Goal) {
    if (!goal.target_date || goal.status === 'completed') return false;
    return new Date(goal.target_date) < new Date(new Date().toDateString());
  }
}
