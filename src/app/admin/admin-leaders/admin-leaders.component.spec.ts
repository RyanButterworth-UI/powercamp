import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AdminLeadersComponent } from './admin-leaders.component';
import { AdminLeader } from '../admin.service';
import { environment } from '../../../environments/environment';

function makeLeader(over: Partial<AdminLeader> = {}): AdminLeader {
  return {
    id: 1,
    year: 2026,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    cell: '+27 82 555 0101',
    gender: 'F',
    age: '28',
    grade: 'Leader',
    church: 'Saga Chapel',
    tshirt: 'M',
    parentName: null,
    parentPhone: null,
    parentEmail: null,
    applicationNotes: 'Ran the tuck shop in 2025',
    status: 'approved',
    approvedByNeil: true,
    approvedAt: '2026-01-01T00:00:00.000Z',
    paymentReceivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('AdminLeadersComponent — search', () => {
  let fixture: ComponentFixture<AdminLeadersComponent>;
  let httpMock: HttpTestingController;

  const LEADERS = [
    makeLeader({ id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
    makeLeader({
      id: 2,
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@navy.mil',
      church: 'Harbour Church',
      cell: '+27 83 555 0199',
      applicationNotes: 'Allergic to peanuts',
    }),
    makeLeader({ id: 3, firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com', year: 2025 }),
  ];

  beforeEach(async () => {
    sessionStorage.setItem('powercamp.admin.token', 'test-token');
    await TestBed.configureTestingModule({
      imports: [AdminLeadersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLeadersComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.baseApi}/admin/leaders`)
      .flush({ total: LEADERS.length, leaders: LEADERS });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  // The year tabs default to the newest year, so 2026 only.
  it('shows the selected year with no query', () => {
    const rows = fixture.componentInstance.visibleLeaders();
    expect(rows.map((l) => l.id)).toEqual([1, 2]);
  });

  it('matches on name', () => {
    fixture.componentInstance.searchQuery.set('hopper');
    expect(fixture.componentInstance.visibleLeaders().map((l) => l.id)).toEqual([2]);
  });

  it('matches on email', () => {
    fixture.componentInstance.searchQuery.set('navy.mil');
    expect(fixture.componentInstance.visibleLeaders().map((l) => l.id)).toEqual([2]);
  });

  // The point of the shared searchableHay helper: fields that have no column
  // in the table are still searchable.
  it('matches on a field with no column, like application notes', () => {
    fixture.componentInstance.searchQuery.set('peanuts');
    expect(fixture.componentInstance.visibleLeaders().map((l) => l.id)).toEqual([2]);
  });

  it('matches on church and ignores case', () => {
    fixture.componentInstance.searchQuery.set('HARBOUR');
    expect(fixture.componentInstance.visibleLeaders().map((l) => l.id)).toEqual([2]);
  });

  it('stays inside the selected year', () => {
    // Alan is a 2025 leader; the 2026 tab must not surface him.
    fixture.componentInstance.searchQuery.set('turing');
    expect(fixture.componentInstance.visibleLeaders()).toEqual([]);

    fixture.componentInstance.selectedYear.set(2025);
    expect(fixture.componentInstance.visibleLeaders().map((l) => l.id)).toEqual([3]);
  });

  it('returns nothing for a query that matches no leader', () => {
    fixture.componentInstance.searchQuery.set('zzzznope');
    expect(fixture.componentInstance.visibleLeaders()).toEqual([]);
  });

  it('renders the search box and a no-match message', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="leaders-search"]')).toBeTruthy();

    fixture.componentInstance.searchQuery.set('zzzznope');
    fixture.detectChanges();
    expect(el.textContent).toContain('No leaders match');
  });
});
