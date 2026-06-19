import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TodoService } from '../../core/services/todo.service';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  colorClass: string;
  available: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private todoService = inject(TodoService);
  private router = inject(Router);

  username = signal('');
  pendingTodos = signal(0);
  todosLoaded = signal(false);

  features: FeatureCard[] = [
    {
      title: 'งานที่ต้องทำ',
      description: 'จัดการ to-do list สร้าง แก้ไข ติดตามความคืบหน้า',
      icon: '✓',
      route: '/todos',
      colorClass: 'indigo',
      available: true
    },
    {
      title: 'ปฏิทิน',
      description: 'บันทึกนัดหมาย กิจกรรม และเหตุการณ์สำคัญ',
      icon: '📅',
      route: '/events',
      colorClass: 'blue',
      available: true
    },
    {
      title: 'บันทึก',
      description: 'จดบันทึกความคิด ไอเดีย และสิ่งที่ต้องจำ',
      icon: '📝',
      route: '/notes',
      colorClass: 'emerald',
      available: true
    },
    {
      title: 'เป้าหมาย',
      description: 'ตั้งเป้าหมายและติดตามความก้าวหน้า',
      icon: '🎯',
      route: '/goals',
      colorClass: 'amber',
      available: true
    },
    {
      title: 'การเงิน',
      description: 'บันทึกรายรับ-รายจ่าย วิเคราะห์การใช้เงิน',
      icon: '💰',
      route: '/transactions',
      colorClass: 'rose',
      available: true
    },
    {
      title: 'การแจ้งเตือน',
      description: 'ตั้งเตือนงาน กิจกรรม และเป้าหมายไม่ให้พลาด',
      icon: '🔔',
      route: '/reminders',
      colorClass: 'violet',
      available: true
    }
  ];

  ngOnInit() {
    this.username.set(this.auth.getUsername());
    this.todoService.getAll().subscribe({
      next: res => {
        const pending = res.data.filter((t: any) => !t.is_done).length;
        this.pendingTodos.set(pending);
        this.todosLoaded.set(true);
      },
      error: () => this.todosLoaded.set(true)
    });
  }

  navigate(card: FeatureCard) {
    if (card.available) {
      this.router.navigate([card.route]);
    }
  }

  logout() {
    this.auth.logout();
  }
}
