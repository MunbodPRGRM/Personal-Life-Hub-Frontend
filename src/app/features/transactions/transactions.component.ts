import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionService, Transaction, TransactionType } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';

type TypeFilter = 'all' | TransactionType;

@Component({
  selector: 'app-transactions',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private txService = inject(TransactionService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  transactions = signal<Transaction[]>([]);
  loading      = signal(true);
  adding       = signal(false);
  error        = signal('');
  filter       = signal<TypeFilter>('all');
  editingId    = signal<number | null>(null);

  private amount(t: Transaction) { return Number(t.amount) || 0; }

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.transactions() : this.transactions().filter(t => t.type === f);
  });

  summary = computed(() => {
    let income = 0, expense = 0;
    for (const t of this.transactions()) {
      if (t.type === 'income') income += this.amount(t);
      else expense += this.amount(t);
    }
    return { income, expense, balance: income - expense };
  });

  addForm = this.fb.group({
    type:     ['expense' as TransactionType, Validators.required],
    amount:   [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: [''],
    note:     [''],
    date:     [this.today(), Validators.required]
  });

  editForm = this.fb.group({
    type:     ['expense' as TransactionType, Validators.required],
    amount:   [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: [''],
    note:     [''],
    date:     ['', Validators.required]
  });

  readonly filterOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all',     label: 'ทั้งหมด' },
    { value: 'income',  label: 'รายรับ' },
    { value: 'expense', label: 'รายจ่าย' },
  ];

  ngOnInit() {
    this.txService.getAll().subscribe({
      next: res => { this.transactions.set(res.data); this.loading.set(false); },
      error: ()  => { this.error.set('โหลดข้อมูลล้มเหลว'); this.loading.set(false); }
    });
  }

  private sortByDate(list: Transaction[]) {
    return [...list].sort((a, b) =>
      b.date.localeCompare(a.date) || b.id - a.id
    );
  }

  addTransaction() {
    if (this.addForm.invalid || this.adding()) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.adding.set(true);
    this.error.set('');
    const v = this.addForm.value;

    this.txService.create({
      type:     v.type!,
      amount:   Number(v.amount),
      category: v.category || undefined,
      note:     v.note || undefined,
      date:     v.date!,
    }).subscribe({
      next: res => {
        this.transactions.update(list => this.sortByDate([res.data, ...list]));
        this.addForm.reset({ type: 'expense', amount: null, date: this.today() });
        this.adding.set(false);
      },
      error: err => {
        this.error.set(err.error?.message || 'บันทึกรายการล้มเหลว');
        this.adding.set(false);
      }
    });
  }

  startEdit(t: Transaction) {
    this.editingId.set(t.id);
    this.editForm.setValue({
      type:     t.type,
      amount:   this.amount(t),
      category: t.category ?? '',
      note:     t.note ?? '',
      date:     t.date ? t.date.split('T')[0] : '',
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(t: Transaction) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.value;
    this.txService.update(t.id, {
      type:     v.type!,
      amount:   Number(v.amount),
      category: v.category || undefined,
      note:     v.note || undefined,
      date:     v.date || undefined,
    }).subscribe({
      next: res => {
        this.transactions.update(list => this.sortByDate(list.map(x => x.id === t.id ? res.data : x)));
        this.editingId.set(null);
      },
      error: err => this.error.set(err.error?.message || 'แก้ไขรายการล้มเหลว')
    });
  }

  deleteTransaction(id: number) {
    this.txService.remove(id).subscribe({
      next: () => {
        this.transactions.update(list => list.filter(t => t.id !== id));
        if (this.editingId() === id) this.editingId.set(null);
      },
      error: () => this.error.set('ลบรายการล้มเหลว')
    });
  }

  setFilter(f: TypeFilter) { this.filter.set(f); }

  logout() { this.auth.logout(); }

  private today() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  formatAmount(value: string | number) {
    return Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
