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
  dob: string | null;
  gender: string | null;
  age: string | null;
  grade: string | null;
  email: string | null;
  camperCell: string | null;
  medical: string | null;
  tshirt: string | null;
  church: string | null;
  generalInfo: string | null;
  friends: string[] | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string;
  source: string | null;
  consentGeneral: string | null;
  consentLocation: string | null;
  consentRisk: string | null;
  consentPowerCamp: string | null;
  consentBehaviour: string | null;
  consentPhoto: string | null;
  consentEmergencyName: string | null;
  consentEmergencyContact: string | null;
  consentMedicalAidName: string | null;
  consentMedicalAidNumber: string | null;
  consentDate: string | null;
  consentAcceptedAt: string | null;
  paymentReceivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Team {
  id: number;
  year: number;
  name: string;
  color: string | null;
  captainLeaderId: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface TeamAssignment { camperId: number; teamId: number | null; }

export interface Bunk {
  id: number;
  year: number;
  name: string;
  gender: 'Male' | 'Female';
  leaderId: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface BunkAssignment { camperId: number; bunkId: number | null; }

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

  me(): Observable<{ ok: boolean; campYear: number }> {
    return this.http.get<{ ok: boolean; campYear: number }>(
      `${environment.baseApi}/admin/me`,
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

  listLeaders(): Observable<{ total: number; leaders: AdminLeader[] }> {
    return this.http.get<{ total: number; leaders: AdminLeader[] }>(
      `${environment.baseApi}/admin/leaders`,
      { headers: this.authHeaders() }
    );
  }

  approveLeader(id: number, neilPassword: string): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(
      `${environment.baseApi}/admin/leaders/${id}/approve`,
      { neilPassword },
      { headers: this.authHeaders() }
    );
  }

  rejectLeader(id: number, neilPassword: string): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(
      `${environment.baseApi}/admin/leaders/${id}/reject`,
      { neilPassword },
      { headers: this.authHeaders() }
    );
  }

  inviteLeader(id: number, neilPassword: string): Observable<{ id: number; sentTo: string }> {
    return this.http.post<{ id: number; sentTo: string }>(
      `${environment.baseApi}/admin/leaders/${id}/invite`,
      { neilPassword },
      { headers: this.authHeaders() }
    );
  }

  // ----- Teams -----
  listTeams(): Observable<{ teams: Team[]; assignments: TeamAssignment[] }> {
    return this.http.get<{ teams: Team[]; assignments: TeamAssignment[] }>(
      `${environment.baseApi}/admin/teams`,
      { headers: this.authHeaders() }
    );
  }
  createTeam(body: { name: string; color?: string | null; captainLeaderId?: number | null }): Observable<{ team: Team }> {
    return this.http.post<{ team: Team }>(
      `${environment.baseApi}/admin/teams`,
      body,
      { headers: this.authHeaders() }
    );
  }
  updateTeam(id: number, body: { name?: string; color?: string | null; captainLeaderId?: number | null }): Observable<{ team: Team }> {
    return this.http.post<{ team: Team }>(
      `${environment.baseApi}/admin/teams/${id}`,
      body,
      { headers: this.authHeaders() }
    );
  }
  deleteTeam(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(
      `${environment.baseApi}/admin/teams/${id}`,
      { headers: this.authHeaders() }
    );
  }
  saveTeamAssignments(assignments: TeamAssignment[]): Observable<{ ok: boolean; count: number }> {
    return this.http.post<{ ok: boolean; count: number }>(
      `${environment.baseApi}/admin/teams/assignments`,
      { assignments },
      { headers: this.authHeaders() }
    );
  }

  // ----- Bunks -----
  listBunks(): Observable<{ bunks: Bunk[]; assignments: BunkAssignment[] }> {
    return this.http.get<{ bunks: Bunk[]; assignments: BunkAssignment[] }>(
      `${environment.baseApi}/admin/bunks`,
      { headers: this.authHeaders() }
    );
  }
  createBunk(body: { name: string; gender: 'Male' | 'Female'; leaderId?: number | null }): Observable<{ bunk: Bunk }> {
    return this.http.post<{ bunk: Bunk }>(
      `${environment.baseApi}/admin/bunks`,
      body,
      { headers: this.authHeaders() }
    );
  }
  updateBunk(id: number, body: { name?: string; gender?: 'Male' | 'Female'; leaderId?: number | null }): Observable<{ bunk: Bunk }> {
    return this.http.post<{ bunk: Bunk }>(
      `${environment.baseApi}/admin/bunks/${id}`,
      body,
      { headers: this.authHeaders() }
    );
  }
  deleteBunk(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(
      `${environment.baseApi}/admin/bunks/${id}`,
      { headers: this.authHeaders() }
    );
  }
  saveBunkAssignments(assignments: BunkAssignment[]): Observable<{ ok: boolean; count: number }> {
    return this.http.post<{ ok: boolean; count: number }>(
      `${environment.baseApi}/admin/bunks/assignments`,
      { assignments },
      { headers: this.authHeaders() }
    );
  }

  directAddLeader(neilPassword: string, leader: NewAdminLeader): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(
      `${environment.baseApi}/admin/leaders/direct-add`,
      { neilPassword, ...leader },
      { headers: this.authHeaders() }
    );
  }

  markPaid(camperId: number): Observable<{ id: number; paymentReceivedAt: string }> {
    return this.http.post<{ id: number; paymentReceivedAt: string }>(
      `${environment.baseApi}/admin/campers/${camperId}/mark-paid`,
      {},
      { headers: this.authHeaders() }
    );
  }

  markLeaderPaid(leaderId: number): Observable<{ id: number; paymentReceivedAt: string }> {
    return this.http.post<{ id: number; paymentReceivedAt: string }>(
      `${environment.baseApi}/admin/leaders/${leaderId}/mark-paid`,
      {},
      { headers: this.authHeaders() }
    );
  }

  updateParentEmail(camperId: number, parentEmail: string): Observable<{ id: number; parentEmail: string }> {
    return this.http.post<{ id: number; parentEmail: string }>(
      `${environment.baseApi}/admin/campers/${camperId}/update-email`,
      { parentEmail },
      { headers: this.authHeaders() }
    );
  }

  bulkEmailPreview(subject: string, blocks: EmailBlock[]): Observable<{ html: string }> {
    return this.http.post<{ html: string }>(
      `${environment.baseApi}/admin/bulk-email/preview`,
      { subject, blocks },
      { headers: this.authHeaders() }
    );
  }

  bulkEmailSend(
    subject: string,
    blocks: EmailBlock[],
    recipients: string[]
  ): Observable<{ sent: number; totalRecipients: number; unsubscribedSkipped: number; failed: { to: string; error: string }[] }> {
    return this.http.post<{ sent: number; totalRecipients: number; unsubscribedSkipped: number; failed: { to: string; error: string }[] }>(
      `${environment.baseApi}/admin/bulk-email`,
      { subject, blocks, recipients },
      { headers: this.authHeaders() }
    );
  }
}

export type EmailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'button'; text: string; url: string }
  | { kind: 'divider' };

export interface AdminLeader {
  id: number;
  year: number;
  firstName: string;
  lastName: string;
  email: string;
  cell: string | null;
  gender: string | null;
  age: string | null;
  grade: string | null;
  church: string | null;
  tshirt: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  applicationNotes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approvedByNeil: boolean;
  approvedAt: string | null;
  paymentReceivedAt: string | null;
  createdAt: string | null;
}

export interface NewAdminLeader {
  firstName: string;
  lastName: string;
  email: string;
  cell?: string;
  gender?: string;
  age?: string;
  grade?: string;
  church?: string;
  tshirt?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  applicationNotes?: string;
}
