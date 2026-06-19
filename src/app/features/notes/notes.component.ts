import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NoteService, Note } from '../../core/services/note.service';
import { AuthService } from '../../core/services/auth.service';

type TagFilter = 'all' | 'work' | 'personal' | 'study' | 'other';

@Component({
  selector: 'app-notes',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss'
})
export class NotesComponent implements OnInit {
  private noteService = inject(NoteService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  notes     = signal<Note[]>([]);
  loading   = signal(true);
  adding    = signal(false);
  error     = signal('');
  filter    = signal<TagFilter>('all');
  editingId = signal<number | null>(null);

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.notes() : this.notes().filter(n => n.tags === f);
  });

  addForm = this.fb.group({
    title:   ['', Validators.required],
    content: [''],
    tags:    ['other']
  });

  editForm = this.fb.group({
    title:   ['', Validators.required],
    content: [''],
    tags:    ['other']
  });

  readonly tagOptions: { value: TagFilter; label: string }[] = [
    { value: 'all',      label: 'ทั้งหมด' },
    { value: 'work',     label: 'งาน' },
    { value: 'personal', label: 'ส่วนตัว' },
    { value: 'study',    label: 'เรียน' },
    { value: 'other',    label: 'อื่น ๆ' },
  ];

  ngOnInit() {
    this.noteService.getAll().subscribe({
      next: res => { this.notes.set(res.data); this.loading.set(false); },
      error: ()  => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  addNote() {
    if (this.addForm.invalid || this.adding()) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');
    const { title, content, tags } = this.addForm.value;

    this.noteService.create({ title: title!, content: content || undefined, tags: tags || undefined }).subscribe({
      next: res => {
        this.notes.update(list => [res.data, ...list]);
        this.addForm.reset({ tags: 'other' });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'เพิ่ม note ล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  startEdit(note: Note) {
    this.editingId.set(note.id);
    this.editForm.setValue({ title: note.title, content: note.content ?? '', tags: note.tags });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(note: Note) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const { title, content, tags } = this.editForm.value;
    this.noteService.update(note.id, { title: title!, content: content || undefined, tags: tags || undefined }).subscribe({
      next: res => {
        this.notes.update(list => list.map(n => n.id === note.id ? res.data : n));
        this.editingId.set(null);
      },
      error: () => this.error.set('แก้ไข note ล้มเหลว')
    });
  }

  deleteNote(id: number) {
    this.noteService.remove(id).subscribe({
      next: () => {
        this.notes.update(list => list.filter(n => n.id !== id));
        if (this.editingId() === id) this.editingId.set(null);
      },
      error: () => this.error.set('ลบ note ล้มเหลว')
    });
  }

  setFilter(tag: TagFilter) {
    this.filter.set(tag);
  }

  logout() {
    this.auth.logout();
  }

  tagLabel(tag: string) {
    return this.tagOptions.find(t => t.value === tag)?.label ?? tag;
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
