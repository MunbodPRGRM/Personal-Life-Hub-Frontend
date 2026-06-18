import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  error = signal('');
  success = signal('');

  get usernameCtrl() { return this.form.get('username')!; }
  get emailCtrl() { return this.form.get('email')!; }
  get passwordCtrl() { return this.form.get('password')!; }

  submit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const { username, email, password } = this.form.value;
    this.auth.register(username!, email!, password!).subscribe({
      next: res => {
        this.success.set(res.message || 'สมัครสมาชิกสำเร็จ');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: err => {
        this.error.set(err.error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        this.loading.set(false);
      }
    });
  }
}
