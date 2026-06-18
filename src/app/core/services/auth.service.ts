import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

const TOKEN_KEY = 'plh_token';

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  data?: { id: number; username: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  register(username: string, email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/register', { username, email, password });
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
