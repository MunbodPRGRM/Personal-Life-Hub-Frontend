import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReminderService, Reminder, RefType } from '../../core/services/reminder.service';
import { TodoService } from '../../core/services/todo.service';
import { EventService } from '../../core/services/event.service';
import { GoalService } from '../../core/services/goal.service';
import { AuthService } from '../../core/services/auth.service';

type StatusFilter = 'all' | 'pending' | 'sent';
interface RefItem { id: number; title: string; }

@Component({
  selector: 'app-reminders',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss'
})
export class RemindersComponent implements OnInit {
  private reminderService = inject(ReminderService);
  private todoService = inject(TodoService);
  private eventService = inject(EventService);
  private goalService = inject(GoalService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  reminders = signal<Reminder[]>([]);
  loading   = signal(true);
  adding    = signal(false);
  error     = signal('');
  filter    = signal<StatusFilter>('all');
  editingId = signal<number | null>(null);

  items = signal<Record<RefType, RefItem[]>>({ todo: [], event: [], goal: [] });

  addRefType  = signal<RefType>('todo');
  editRefType = signal<RefType>('todo');

  readonly refTypeOptions: { value: RefType; label: string; icon: string }[] = [
    { value: 'todo',  label: 'งานที่ต้องทำ', icon: '✓' },
    { value: 'event', label: 'กิจกรรม',       icon: '📅' },
    { value: 'goal',  label: 'เป้าหมาย',      icon: '🎯' },
  ];

  readonly filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all',     label: 'ทั้งหมด' },
    { value: 'pending', label: 'รอแจ้งเตือน' },
    { value: 'sent',    label: 'แจ้งแล้ว' },
  ];

  addRefOptions  = computed(() => this.items()[this.addRefType()]);
  editRefOptions = computed(() => this.items()[this.editRefType()]);

  private sent(r: Reminder) { return !!Number(r.is_sent); }

  filtered = computed(() => {
    const f = this.filter();
    const list = this.reminders();
    if (f === 'pending') return list.filter(r => !this.sent(r));
    if (f === 'sent')    return list.filter(r => this.sent(r));
    return list;
  });

  summary = computed(() => ({
    total:   this.reminders().length,
    pending: this.reminders().filter(r => !this.sent(r)).length,
    sent:    this.reminders().filter(r => this.sent(r)).length,
  }));

  addForm = this.fb.group({
    ref_type:  ['todo' as RefType, Validators.required],
    ref_id:    [null as number | null, Validators.required],
    remind_at: ['', Validators.required],
  });

  editForm = this.fb.group({
    ref_type:  ['todo' as RefType, Validators.required],
    ref_id:    [null as number | null, Validators.required],
    remind_at: ['', Validators.required],
  });

  ngOnInit() {
    // keep ref option lists in sync with the chosen type, and reset the picked item
    this.addForm.controls.ref_type.valueChanges.subscribe(v => {
      this.addRefType.set((v ?? 'todo') as RefType);
      this.addForm.controls.ref_id.setValue(null);
    });
    this.editForm.controls.ref_type.valueChanges.subscribe(v => {
      this.editRefType.set((v ?? 'todo') as RefType);
    });

    forkJoin({
      reminders: this.reminderService.getAll(),
      todos:     this.todoService.getAll(),
      events:    this.eventService.getAll(),
      goals:     this.goalService.getAll(),
    }).subscribe({
      next: res => {
        this.items.set({
          todo:  res.todos.data.map((t: any)  => ({ id: t.id, title: t.title })),
          event: res.events.data.map((e: any) => ({ id: e.id, title: e.title })),
          goal:  res.goals.data.map((g: any)  => ({ id: g.id, title: g.title })),
        });
        this.reminders.set(res.reminders.data);
        this.loading.set(false);
      },
      error: () => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  private titleFor(type: RefType, id: number) {
    return this.items()[type].find(i => i.id === id)?.title ?? null;
  }

  private sortByRemindAt(list: Reminder[]) {
    return [...list].sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());
  }

  addReminder() {
    if (this.addForm.invalid || this.adding()) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');
    const v = this.addForm.value;

    this.reminderService.create({
      ref_type:  v.ref_type!,
      ref_id:    Number(v.ref_id),
      remind_at: v.remind_at!,
    }).subscribe({
      next: res => {
        this.reminders.update(list => this.sortByRemindAt([res.data, ...list]));
        this.addForm.reset({ ref_type: v.ref_type!, ref_id: null, remind_at: '' });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'สร้างการแจ้งเตือนล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  startEdit(r: Reminder) {
    this.editingId.set(r.id);
    this.editRefType.set(r.ref_type);
    this.editForm.setValue({
      ref_type:  r.ref_type,
      ref_id:    r.ref_id,
      remind_at: this.toInputValue(r.remind_at),
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(r: Reminder) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.reminderService.update(r.id, {
      ref_type:  v.ref_type!,
      ref_id:    Number(v.ref_id),
      remind_at: v.remind_at!,
    }).subscribe({
      next: res => {
        const enriched = { ...res.data, ref_title: this.titleFor(res.data.ref_type, res.data.ref_id) };
        this.reminders.update(list => this.sortByRemindAt(list.map(x => x.id === r.id ? enriched : x)));
        this.editingId.set(null);
      },
      error: err => this.error.set(err.error?.message || 'แก้ไขการแจ้งเตือนล้มเหลว')
    });
  }

  toggleSent(r: Reminder) {
    const next = !this.sent(r);
    this.reminderService.update(r.id, { is_sent: next }).subscribe({
      next: res => {
        const enriched = { ...res.data, ref_title: r.ref_title ?? this.titleFor(res.data.ref_type, res.data.ref_id) };
        this.reminders.update(list => list.map(x => x.id === r.id ? enriched : x));
      },
      error: () => this.error.set('อัปเดตสถานะล้มเหลว')
    });
  }

  deleteReminder(id: number) {
    this.reminderService.remove(id).subscribe({
      next: () => {
        this.reminders.update(list => list.filter(r => r.id !== id));
        if (this.editingId() === id) this.editingId.set(null);
      },
      error: () => this.error.set('ลบการแจ้งเตือนล้มเหลว')
    });
  }

  setFilter(f: StatusFilter) { this.filter.set(f); }

  logout() { this.auth.logout(); }

  isSent(r: Reminder) { return this.sent(r); }

  isOverdue(r: Reminder) {
    return !this.sent(r) && new Date(r.remind_at) < new Date();
  }

  refLabel(type: RefType) {
    return this.refTypeOptions.find(o => o.value === type)?.label ?? type;
  }

  refIcon(type: RefType) {
    return this.refTypeOptions.find(o => o.value === type)?.icon ?? '🔔';
  }

  // ISO string -> value for <input type="datetime-local"> (local time, no seconds)
  private toInputValue(d: string) {
    const date = new Date(d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  formatDateTime(d: string) {
    return new Date(d).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
