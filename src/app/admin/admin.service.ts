import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'powercamp.admin.token';

export interface AdminCamper {
  id: number;
  year: number;
  firstName: string;
  lastName: string;
  email: string | null;
  parentEmail: string;
  parentName: string | null;
  grade: string | null;
  consentAcceptedAt: string | null;
  paymentReceivedAt: string | null;
  source: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.getToken() ?? ''}` });
  }

  login(password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${environment.baseApi}/admin/login`, { password });
  }

  list(): Observable<{ total: number; campers: AdminCamper[] }> {
    return this.http.get<{ total: number; campers: AdminCamper[] }>(
      `${environment.baseApi}/admin/campers`,
      { headers: this.authHeaders() }
    );
  }

  exportXlsxUrl(): string {
    // The /admin/export endpoint requires Authorization, so we can't just window.location it.
    // The component will fetch as a blob and trigger a download.
    return `${environment.baseApi}/admin/export`;
  }

  downloadExport(): Observable<Blob> {
    return this.http.get(`${environment.baseApi}/admin/export`, {
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }
}
