import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'powercamp.admin.token';
// The inline-edit second factor. Kept separate from the admin token so locking
// editing (or it expiring) never logs the admin out of the dashboard. Session-
// scoped: closing the tab re-locks editing, matching "unlock once per session".
const EDITOR_TOKEN_KEY = 'powercamp.editor.token';

// The fields the inline editor may change. Mirrors the backend's editable set —
// notably it excludes the six consent agreements + consent date, which are
// never editable here.
export interface CamperEditPayload {
  firstName: string;
  lastName: string;
  parentEmail: string;
  dob?: string;
  gender?: string;
  age?: string;
  grade?: string;
  email?: string;
  camperCell?: string;
  medical?: string;
  tshirt?: string;
  church?: string;
  generalInfo?: string;
  friends?: string[];
  parentName?: string;
  parentPhone?: string;
  consentEmergencyName?: string;
  consentEmergencyContact?: string;
  consentMedicalAidName?: string;
  consentMedicalAidNumber?: string;
}

export interface DeleteResult {
  id: number;
  deleted: boolean;
}

export interface CamperChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export interface CamperEditResult {
  id: number;
  changed: number;
  changes: CamperChange[];
}

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

export interface WaitlistEntry {
  id: number;
  year: number;
  camperName: string;
  parentName: string | null;
  parentEmail: string;
  phone: string | null;
  grade: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

// ----- Sheet ↔ DB reconciliation report (read-only) -----
export interface ReconcileFieldDiff {
  field: string;
  sheet: string;
  db: string;
}
export interface ReconcileSheetOnly {
  rowNumber: number;
  camperId: number | null;
  firstName: string;
  lastName: string;
  parentEmail: string;
  grade: string;
}
export interface ReconcileDbOnly {
  id: number;
  firstName: string;
  lastName: string;
  parentEmail: string;
  grade: string;
}
export interface ReconcileConflict {
  camperId: number | null;
  rowNumber: number;
  firstName: string;
  lastName: string;
  parentEmail: string;
  diffs: ReconcileFieldDiff[];
}
export interface ReconcileResult {
  counts: {
    sheetRows: number;
    dbCampers: number;
    matched: number;
    sheetOnly: number;
    dbOnly: number;
    conflicts: number;
  };
  sheetOnly: ReconcileSheetOnly[];
  dbOnly: ReconcileDbOnly[];
  conflicts: ReconcileConflict[];
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
    // Signing out must also re-lock editing.
    sessionStorage.removeItem(EDITOR_TOKEN_KEY);
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.getToken() ?? ''}` });
  }

  // ----- Inline-edit second factor -----
  getEditorToken(): string | null {
    return sessionStorage.getItem(EDITOR_TOKEN_KEY);
  }

  setEditorToken(token: string): void {
    sessionStorage.setItem(EDITOR_TOKEN_KEY, token);
  }

  clearEditorToken(): void {
    sessionStorage.removeItem(EDITOR_TOKEN_KEY);
  }

  isEditorUnlocked(): boolean {
    return !!this.getEditorToken();
  }

  // Admin Bearer token + the editor token in its own header. Used only by the
  // gated edit endpoint.
  private editorHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken() ?? ''}`,
      'X-Editor-Token': this.getEditorToken() ?? '',
    });
  }

  // Exchange the edit password for a short-lived editor token. The caller is
  // responsible for storing it via setEditorToken on success.
  unlockEditor(password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${environment.baseApi}/admin/editor/unlock`,
      { password },
      { headers: this.authHeaders() }
    );
  }

  editCamper(id: number, payload: CamperEditPayload): Observable<CamperEditResult> {
    return this.http.post<CamperEditResult>(
      `${environment.baseApi}/admin/campers/${id}/edit`,
      payload,
      { headers: this.editorHeaders() }
    );
  }

  login(password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${environment.baseApi}/admin/login`, { password });
  }

  // ----- Registrations open/closed -----
  getRegistrationStatus(): Observable<{ registrationsOpen: boolean }> {
    return this.http.get<{ registrationsOpen: boolean }>(
      `${environment.baseApi}/admin/registration-status`,
      { headers: this.authHeaders() }
    );
  }

  setRegistrationStatus(open: boolean): Observable<{ registrationsOpen: boolean }> {
    return this.http.post<{ registrationsOpen: boolean }>(
      `${environment.baseApi}/admin/registration-status`,
      { open },
      { headers: this.authHeaders() }
    );
  }

  // ----- Waiting list -----
  listWaitlist(): Observable<{ total: number; waitlist: WaitlistEntry[] }> {
    return this.http.get<{ total: number; waitlist: WaitlistEntry[] }>(
      `${environment.baseApi}/admin/waitlist`,
      { headers: this.authHeaders() }
    );
  }

  // ----- Sheet ↔ DB reconciliation (read-only) -----
  getReconcile(): Observable<ReconcileResult> {
    return this.http.get<ReconcileResult>(
      `${environment.baseApi}/admin/reconcile`,
      { headers: this.authHeaders() }
    );
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

  // Email the parent a link to complete the consent form for a camper we already
  // hold the details for. Used from the campers dashboard when consent is
  // outstanding.
  requestConsent(camperId: number): Observable<{ ok: boolean; sentTo: string }> {
    return this.http.post<{ ok: boolean; sentTo: string }>(
      `${environment.baseApi}/admin/campers/${camperId}/request-consent`,
      {},
      { headers: this.authHeaders() }
    );
  }

  // Move a waiting-list entry onto the main camper list: creates the camper (or
  // reuses an existing one), adds them to the Registrations sheet if not already
  // there, emails the parent a consent link, and removes the waiting-list entry.
  promoteWaitlistEntry(
    entryId: number
  ): Observable<{ camperId: number; alreadyCamper: boolean; addedToSheet: boolean; ok: boolean }> {
    return this.http.post<{ camperId: number; alreadyCamper: boolean; addedToSheet: boolean; ok: boolean }>(
      `${environment.baseApi}/admin/waitlist/${entryId}/promote`,
      {},
      { headers: this.authHeaders() }
    );
  }

  // Move a camper BACK to the waiting list (the inverse of promote). Copies the
  // full record incl. consent onto the waiting list and soft-deletes the camper.
  demoteCamper(camperId: number): Observable<{ waitlistId: number; ok: boolean }> {
    return this.http.post<{ waitlistId: number; ok: boolean }>(
      `${environment.baseApi}/admin/campers/${camperId}/demote`,
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

  // ----- Delete (soft) -----
  // The delete password travels in the body on every call and is never stored,
  // unlike the editor unlock — there's no "delete is unlocked for this session"
  // state, so each deletion is deliberate. The server answers 403 for a wrong
  // delete password and 401 only when the admin session itself has expired.
  deleteCamper(camperId: number, deletePassword: string): Observable<DeleteResult> {
    return this.http.post<DeleteResult>(
      `${environment.baseApi}/admin/campers/${camperId}/delete`,
      { deletePassword },
      { headers: this.authHeaders() }
    );
  }

  deleteLeader(leaderId: number, deletePassword: string): Observable<DeleteResult> {
    return this.http.post<DeleteResult>(
      `${environment.baseApi}/admin/leaders/${leaderId}/delete`,
      { deletePassword },
      { headers: this.authHeaders() }
    );
  }

  deleteWaitlistEntry(entryId: number, deletePassword: string): Observable<DeleteResult> {
    return this.http.post<DeleteResult>(
      `${environment.baseApi}/admin/waitlist/${entryId}/delete`,
      { deletePassword },
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
