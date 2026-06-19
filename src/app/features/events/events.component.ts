import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService, CalendarEvent } from '../../core/services/event.service';
import { AuthService } from '../../core/services/auth.service';

type TimeFilter = 'all' | 'upcoming' | 'past';
type ViewMode = 'list' | 'calendar';

interface DayCell {
  date: Date;
  day: number;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-events',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventsComponent implements OnInit {
  private eventService = inject(EventService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  events    = signal<CalendarEvent[]>([]);
  loading   = signal(true);
  adding    = signal(false);
  error     = signal('');
  filter    = signal<TimeFilter>('all');
  editingId = signal<number | null>(null);

  view = signal<ViewMode>('calendar');

  // calendar navigation state
  private now = new Date();
  viewYear  = signal(this.now.getFullYear());
  viewMonth = signal(this.now.getMonth()); // 0-11
  selectedKey = signal(this.dayKey(this.now));

  readonly weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  readonly colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  readonly defaultColor = this.colors[0];

  private isPast(e: CalendarEvent) {
    const end = e.end_datetime ?? e.start_datetime;
    return new Date(end) < new Date();
  }

  filtered = computed(() => {
    const f = this.filter();
    const list = this.events();
    if (f === 'upcoming') return list.filter(e => !this.isPast(e));
    if (f === 'past')     return list.filter(e => this.isPast(e));
    return list;
  });

  summary = computed(() => ({
    total:    this.events().length,
    upcoming: this.events().filter(e => !this.isPast(e)).length,
    past:     this.events().filter(e => this.isPast(e)).length,
  }));

  // events grouped by local YYYY-MM-DD of their start
  private eventsByDay = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of this.events()) {
      const key = this.dayKey(new Date(e.start_datetime));
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return map;
  });

  // 6-week grid for the current view month
  calendar = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const byDay = this.eventsByDay();
    const todayKey = this.dayKey(new Date());

    const firstDow = new Date(year, month, 1).getDay();
    const gridStart = new Date(year, month, 1 - firstDow);

    const weeks: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const days: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d);
        const key = this.dayKey(date);
        days.push({
          date,
          day: date.getDate(),
          key,
          inMonth: date.getMonth() === month,
          isToday: key === todayKey,
          events: byDay.get(key) ?? [],
        });
      }
      weeks.push(days);
    }
    return weeks;
  });

  monthLabel = computed(() =>
    new Date(this.viewYear(), this.viewMonth(), 1)
      .toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  );

  selectedEvents = computed(() =>
    [...(this.eventsByDay().get(this.selectedKey()) ?? [])]
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
  );

  selectedLabel = computed(() => {
    const [y, m, d] = this.selectedKey().split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  });

  addForm = this.fb.group({
    title:          ['', Validators.required],
    description:    [''],
    start_datetime: ['', Validators.required],
    end_datetime:   [''],
    color:          [this.defaultColor]
  });

  editForm = this.fb.group({
    title:          ['', Validators.required],
    description:    [''],
    start_datetime: ['', Validators.required],
    end_datetime:   [''],
    color:          [this.defaultColor]
  });

  readonly filterOptions: { value: TimeFilter; label: string }[] = [
    { value: 'all',      label: 'ทั้งหมด' },
    { value: 'upcoming', label: 'กำลังจะมาถึง' },
    { value: 'past',     label: 'ผ่านไปแล้ว' },
  ];

  ngOnInit() {
    this.eventService.getAll().subscribe({
      next: res => { this.events.set(res.data); this.loading.set(false); },
      error: ()  => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  private sortByStart(list: CalendarEvent[]) {
    return [...list].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }

  addEvent() {
    if (this.addForm.invalid || this.adding()) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');
    const v = this.addForm.value;

    this.eventService.create({
      title:          v.title!,
      description:    v.description || undefined,
      start_datetime: v.start_datetime!,
      end_datetime:   v.end_datetime || undefined,
      color:          v.color || this.defaultColor,
    }).subscribe({
      next: res => {
        this.events.update(list => this.sortByStart([res.data, ...list]));
        this.addForm.reset({ color: this.defaultColor });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'เพิ่ม event ล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  startEdit(ev: CalendarEvent) {
    this.editingId.set(ev.id);
    this.editForm.setValue({
      title:          ev.title,
      description:    ev.description ?? '',
      start_datetime: this.toInputValue(ev.start_datetime),
      end_datetime:   ev.end_datetime ? this.toInputValue(ev.end_datetime) : '',
      color:          ev.color || this.defaultColor,
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(ev: CalendarEvent) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.eventService.update(ev.id, {
      title:          v.title!,
      description:    v.description || undefined,
      start_datetime: v.start_datetime || undefined,
      end_datetime:   v.end_datetime || undefined,
      color:          v.color || undefined,
    }).subscribe({
      next: res => {
        this.events.update(list => this.sortByStart(list.map(e => e.id === ev.id ? res.data : e)));
        this.editingId.set(null);
      },
      error: err => this.error.set(err.error?.message || 'แก้ไข event ล้มเหลว')
    });
  }

  deleteEvent(id: number) {
    this.eventService.remove(id).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e.id !== id));
        if (this.editingId() === id) this.editingId.set(null);
      },
      error: () => this.error.set('ลบ event ล้มเหลว')
    });
  }

  setFilter(f: TimeFilter) { this.filter.set(f); }
  setView(v: ViewMode) { this.view.set(v); }

  // ── Calendar nav ──────────────────────────────────────
  prevMonth() {
    const m = this.viewMonth();
    if (m === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else { this.viewMonth.set(m - 1); }
  }

  nextMonth() {
    const m = this.viewMonth();
    if (m === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else { this.viewMonth.set(m + 1); }
  }

  goToday() {
    const t = new Date();
    this.viewYear.set(t.getFullYear());
    this.viewMonth.set(t.getMonth());
    this.selectedKey.set(this.dayKey(t));
  }

  selectDay(cell: DayCell) {
    this.selectedKey.set(cell.key);
    if (!cell.inMonth) {
      this.viewYear.set(cell.date.getFullYear());
      this.viewMonth.set(cell.date.getMonth());
    }
  }

  // pre-fill the add form for the selected day at 09:00
  addOnSelectedDay() {
    this.addForm.patchValue({ start_datetime: `${this.selectedKey()}T09:00` });
  }

  logout() { this.auth.logout(); }

  filterLabel(f: TimeFilter) {
    return this.filterOptions.find(o => o.value === f)?.label ?? f;
  }

  isUpcoming(ev: CalendarEvent) { return !this.isPast(ev); }

  pickColor(form: 'add' | 'edit', color: string) {
    (form === 'add' ? this.addForm : this.editForm).patchValue({ color });
  }

  // local Date -> 'YYYY-MM-DD'
  private dayKey(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // ISO string -> value for <input type="datetime-local"> (local time, no seconds)
  private toInputValue(d: string) {
    const date = new Date(d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  formatDateTime(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(d: string) {
    return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }
}
