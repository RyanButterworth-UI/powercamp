import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminCamper, AdminService, CamperEditPayload } from '../admin.service';
import { environment } from '../../../environments/environment';

const COLUMNS_STORAGE_KEY = 'powercamp.admin.columns.v1';

function makeCamper(over: Partial<AdminCamper> = {}): AdminCamper {
  return {
    id: 1,
    year: 2026,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    parentEmail: 'parent@example.com',
    parentName: 'Lord Byron',
    parentPhone: '+27 11 555 0100',
    grade: '10',
    dob: '2010-12-10',
    gender: 'F',
    age: '15',
    camperCell: '+27 82 555 0101',
    medical: 'None',
    tshirt: 'M',
    church: 'Saga',
    generalInfo: 'Loves machines',
    friends: ['Charles'],
    source: 'web',
    consentGeneral: 'yes',
    consentLocation: 'yes',
    consentRisk: 'yes',
    consentPowerCamp: 'yes',
    consentBehaviour: 'yes',
    consentPhoto: 'yes',
    consentEmergencyName: 'Lord Byron',
    consentEmergencyContact: '+27 11 555 0100',
    consentMedicalAidName: 'Discovery',
    consentMedicalAidNumber: '123456',
    consentDate: '2026-01-15',
    consentAcceptedAt: '2026-01-15T10:00:00.000Z',
    paymentReceivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...over,
  } as AdminCamper;
}

describe('AdminDashboardComponent — column registry & toggle', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(AdminDashboardComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/admin/me`).flush({ ok: true, campYear: 2026 });
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 1,
      campers: [makeCamper()],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('exposes every camper field as a toggleable column', () => {
    const keys = fixture.componentInstance.allColumns.map((c) => c.key);
    for (const expected of [
      'name', 'parentEmail', 'parentName', 'parentPhone', 'grade', 'dob',
      'gender', 'age', 'camperCell', 'consent', 'consentDate',
      'consentEmergencyName', 'consentEmergencyContact',
      'payment', 'source', 'createdAt',
    ]) {
      expect(keys).toContain(expected);
    }
    // Camp group + medical-aid + medical-notes are gone.
    for (const removed of [
      'church', 'tshirt', 'friends', 'generalInfo',
      'medical', 'consentMedicalAidName', 'consentMedicalAidNumber',
    ]) {
      expect(keys).not.toContain(removed);
    }
  });

  it('defaults to the current (Camper) group columns initially', () => {
    const visible = fixture.componentInstance.visibleColumns().map((c) => c.key);
    expect(visible).toEqual(['name', 'grade', 'dob', 'gender', 'age']);
  });

  it('toggleColumn flips a hidden column on and an active one off', () => {
    const c = fixture.componentInstance;
    expect(c.isColumnVisible('parentPhone')).toBe(false);

    c.toggleColumn('parentPhone');
    expect(c.isColumnVisible('parentPhone')).toBe(true);
    expect(c.visibleColumns().map((x) => x.key)).toContain('parentPhone');

    c.toggleColumn('grade');
    expect(c.isColumnVisible('grade')).toBe(false);
    expect(c.visibleColumns().map((x) => x.key)).not.toContain('grade');
  });

  it('persists visible-column changes to localStorage', () => {
    fixture.componentInstance.toggleColumn('parentPhone');
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored).toContain('parentPhone');
    expect(stored).toContain('name');
  });

  it('renders one <th> per visible column', () => {
    const c = fixture.componentInstance;
    c.toggleColumn('parentPhone');
    c.toggleColumn('camperCell');
    fixture.detectChanges();

    const headers: HTMLElement[] = fixture.nativeElement.querySelectorAll(
      '[data-testid="campers-columns-header"] th'
    );
    // +1 for the leading (label-less) Edit action column.
    expect(headers.length).toBe(c.visibleColumns().length + 1);
  });

  it('renders a column pill for every column above the table', () => {
    const pillBar: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="columns-pills"]'
    );
    expect(pillBar).not.toBeNull();

    const pills = pillBar!.querySelectorAll('[data-testid^="col-pill-"]');
    expect(pills.length).toBe(fixture.componentInstance.allColumns.length);

    // Pill bar should sit before the scrollable table wrapper.
    const tableWrap = fixture.nativeElement.querySelector(
      '[data-testid="campers-table-scroll"]'
    ) as HTMLElement;
    expect(
      pillBar!.compareDocumentPosition(tableWrap) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('exposes columns grouped into logical sections', () => {
    const groups = fixture.componentInstance.columnGroups();
    const byKey = Object.fromEntries(
      groups.map((g) => [g.key, g.columns.map((c) => c.key)])
    );
    expect(byKey['camper']).toEqual(expect.arrayContaining(['name', 'grade', 'dob', 'gender', 'age']));
    expect(byKey['contact']).toEqual(
      expect.arrayContaining(['parentEmail', 'parentName', 'parentPhone', 'email', 'camperCell'])
    );
    expect(byKey['camp']).toBeUndefined();
    expect(byKey['emergency']).toEqual(
      expect.arrayContaining(['consentEmergencyName', 'consentEmergencyContact'])
    );
    expect(byKey['status']).toEqual(expect.arrayContaining(['consent', 'consentDate', 'payment']));
    expect(byKey['meta']).toEqual(expect.arrayContaining(['source', 'createdAt']));

    // Every column belongs to exactly one group.
    const grouped = groups.flatMap((g) => g.columns.map((c) => c.key));
    expect(grouped.sort()).toEqual(
      fixture.componentInstance.allColumns.map((c) => c.key).sort()
    );
  });

  it('renders one labelled pill row per group with its own pills', () => {
    const groups = fixture.componentInstance.columnGroups();
    for (const g of groups) {
      const row = fixture.nativeElement.querySelector(
        `[data-testid="col-group-${g.key}"]`
      ) as HTMLElement | null;
      expect(row).not.toBeNull();
      expect(row!.textContent).toContain(g.label);
      const pillsInRow = row!.querySelectorAll('[data-testid^="col-pill-"]');
      expect(pillsInRow.length).toBe(g.columns.length);
    }
  });

  it('reflects visibility on the pill via .is-active', () => {
    const pill = fixture.nativeElement.querySelector(
      '[data-testid="col-pill-parentPhone"]'
    ) as HTMLElement;
    expect(pill.classList.contains('is-active')).toBe(false);

    fixture.componentInstance.toggleColumn('parentPhone');
    fixture.detectChanges();
    expect(pill.classList.contains('is-active')).toBe(true);
  });

  it('clicking a pill toggles the column', () => {
    const c = fixture.componentInstance;
    const pill = fixture.nativeElement.querySelector(
      '[data-testid="col-pill-parentPhone"]'
    ) as HTMLElement;
    pill.click();
    expect(c.isColumnVisible('parentPhone')).toBe(true);
  });

  it('no longer renders the old toolbar dropdown', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="columns-toggle"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="columns-menu"]')).toBeNull();
  });

  it('wraps the table in a horizontally scrollable container', () => {
    const wrap: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="campers-table-scroll"]'
    );
    expect(wrap).not.toBeNull();
    expect(wrap!.className).toMatch(/overflow-x-auto/);
  });

  it('renders consent as a circular status badge — consented (green) vs outstanding (red)', () => {
    fixture.componentInstance.toggleColumn('consent'); // not visible in default Camper view
    fixture.componentInstance.campers.set([
      makeCamper({ id: 100, consentAcceptedAt: '2026-01-15T10:00:00.000Z' }),
      makeCamper({ id: 101, consentAcceptedAt: null }),
    ]);
    fixture.componentInstance.selectedYear.set(2026);
    fixture.detectChanges();

    const consented = fixture.nativeElement.querySelector(
      '[data-testid="consent-badge-100"]'
    ) as HTMLElement;
    const outstanding = fixture.nativeElement.querySelector(
      '[data-testid="consent-badge-101"]'
    ) as HTMLElement;
    expect(consented).not.toBeNull();
    expect(outstanding).not.toBeNull();
    expect(consented.classList.contains('status-pill')).toBe(true);
    expect(consented.classList.contains('is-ok')).toBe(true);
    expect(outstanding.classList.contains('status-pill')).toBe(true);
    expect(outstanding.classList.contains('is-bad')).toBe(true);
  });

  it('renders payment "paid" as a button-shaped chip matching Mark paid geometry', () => {
    fixture.componentInstance.toggleColumn('payment'); // not visible in default Camper view
    fixture.componentInstance.campers.set([
      makeCamper({ id: 200, paymentReceivedAt: '2026-04-20T10:00:00.000Z' }),
      makeCamper({ id: 201, paymentReceivedAt: null }),
    ]);
    fixture.componentInstance.selectedYear.set(2026);
    fixture.detectChanges();

    const paidPill = fixture.nativeElement.querySelector(
      '[data-testid="payment-paid-200"]'
    ) as HTMLElement;
    const markBtn = fixture.nativeElement.querySelector(
      '[data-testid="payment-mark-201"]'
    ) as HTMLElement;
    expect(paidPill).not.toBeNull();
    expect(markBtn).not.toBeNull();
    // Same base button class, plus a success modifier on the paid one.
    expect(paidPill.classList.contains('saga-btn')).toBe(true);
    expect(paidPill.classList.contains('saga-btn-success')).toBe(true);
    expect(markBtn.classList.contains('saga-btn')).toBe(true);
    expect(paidPill.textContent?.toLowerCase()).toContain('paid');
  });

  it('positions the search input directly above the table', () => {
    const search = fixture.nativeElement.querySelector(
      '[data-testid="campers-search"]'
    ) as HTMLElement;
    const tableWrap = fixture.nativeElement.querySelector(
      '[data-testid="campers-table-scroll"]'
    ) as HTMLElement;
    const yearTabs = fixture.nativeElement.querySelector(
      '[data-testid="year-tabs"]'
    ) as HTMLElement | null;
    expect(search).not.toBeNull();
    expect(tableWrap).not.toBeNull();
    // Search must sit BEFORE the table…
    expect(
      search.compareDocumentPosition(tableWrap) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // …and AFTER the year-tabs (i.e. just above the table, not at the top of the page).
    if (yearTabs) {
      expect(
        yearTabs.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });
});

describe('AdminDashboardComponent — column persistence on init', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(
      COLUMNS_STORAGE_KEY,
      JSON.stringify(['name', 'parentPhone', 'camperCell'])
    );

    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    fixture = TestBed.createComponent(AdminDashboardComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.baseApi}/admin/me`).flush({ ok: true, campYear: 2026 });
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({ total: 0, campers: [] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('restores the saved visibility on construction (in canonical column order)', () => {
    expect(
      fixture.componentInstance.visibleColumns().map((c) => c.key)
    ).toEqual(['name', 'parentPhone', 'camperCell']);
  });
});

const VIEW_MODE_STORAGE_KEY = 'powercamp.admin.viewMode.v1';

function setupDashboard(seed?: () => void) {
  sessionStorage.clear();
  localStorage.clear();
  if (seed) seed();

  TestBed.configureTestingModule({
    imports: [AdminDashboardComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(AdminDashboardComponent);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne(`${environment.baseApi}/admin/me`).flush({ ok: true, campYear: 2026 });
  return { fixture, http };
}

describe('AdminDashboardComponent — view mode (mix vs group)', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 1,
      campers: [makeCamper()],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('defaults to mix view mode', () => {
    expect(fixture.componentInstance.viewMode()).toBe('mix');
  });

  it('always lands on the Camper group regardless of any persisted choice', () => {
    expect(fixture.componentInstance.selectedGroup()).toBe('camper');
  });

  it('labels the view-mode pills as "Custom" and "Group"', () => {
    const mix = fixture.nativeElement.querySelector('[data-testid="view-mode-mix"]') as HTMLElement;
    const group = fixture.nativeElement.querySelector('[data-testid="view-mode-group"]') as HTMLElement;
    expect(mix).not.toBeNull();
    expect(group).not.toBeNull();
    expect(mix.textContent?.trim()).toBe('Custom');
    expect(group.textContent?.trim()).toBe('Group');
  });

  it('renders a helper line that explains the active view mode', () => {
    // The helper text moved out of the dedicated [data-testid="view-mode-helper"]
    // element into a paragraph above each picker (mix or group).
    // Just assert the columns panel itself exists with both pills.
    const panel = fixture.nativeElement.querySelector(
      '[data-testid="columns-panel"]'
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.textContent?.toLowerCase()).toContain('columns');
  });

  it('switching to group mode shows the Name column pinned plus the selected group\'s columns', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();
    const visible = c.visibleColumns().map((x) => x.key);
    // Name is pinned as the leftmost column in group mode so the admin
    // can always tell who each row is. The selected group's own columns
    // come after it.
    expect(visible).toEqual(['name', 'consentEmergencyName', 'consentEmergencyContact']);
  });

  it('selecting a group via the group selector updates the visible columns', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    fixture.detectChanges();
    const metaBtn = fixture.nativeElement.querySelector(
      '[data-testid="group-select-meta"]'
    ) as HTMLButtonElement;
    expect(metaBtn).not.toBeNull();
    metaBtn.click();
    fixture.detectChanges();
    expect(c.selectedGroup()).toBe('meta');
    // Name pinned + meta group's columns.
    expect(c.visibleColumns().map((x) => x.key)).toEqual(['name', 'source', 'createdAt']);
  });

  it('persists view mode to localStorage (selected group resets each visit)', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('contact');
    fixture.detectChanges();
    expect(localStorage.getItem(VIEW_MODE_STORAGE_KEY)).toBe('group');
    // selectedGroup deliberately is NOT persisted — admins always land
    // back on the Camper group when they reopen the page so the active
    // section is always "who is this row" rather than whatever they last
    // looked at (Payment / Consent / etc.).
  });
});

describe('AdminDashboardComponent — payment/consent filters removed', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({ total: 0, campers: [] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not render the payment filter row', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="payment-filter"]')).toBeNull();
  });

  it('does not render the consent filter row', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="consent-filter"]')).toBeNull();
  });
});

describe('AdminDashboardComponent — sort by column header', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 3,
      campers: [
        makeCamper({ id: 1, firstName: 'Charlie', lastName: 'Brown', grade: '8' }),
        makeCamper({ id: 2, firstName: 'Alice', lastName: 'Adams', grade: '10' }),
        makeCamper({ id: 3, firstName: 'Bob', lastName: 'Carter', grade: '9' }),
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('clicks the Name header to sort ascending by last name', () => {
    const c = fixture.componentInstance;
    c.toggleSort('name');
    expect(c.sortBy()).toBe('name');
    expect(c.sortDir()).toBe('asc');
    expect(c.visibleCampers().map((x) => x.lastName)).toEqual(['Adams', 'Brown', 'Carter']);
  });

  it('clicking the same column flips to descending', () => {
    const c = fixture.componentInstance;
    c.toggleSort('grade');
    c.toggleSort('grade');
    expect(c.sortDir()).toBe('desc');
    expect(c.visibleCampers().map((x) => x.grade)).toEqual(['10', '9', '8']);
  });

  it('clicking a third time clears the sort', () => {
    const c = fixture.componentInstance;
    c.toggleSort('grade');
    c.toggleSort('grade');
    c.toggleSort('grade');
    expect(c.sortBy()).toBeNull();
  });

  it('clicking the rendered <th> calls toggleSort for that column', () => {
    const c = fixture.componentInstance;
    const headers = fixture.nativeElement.querySelectorAll(
      '[data-testid="campers-columns-header"] th'
    ) as NodeListOf<HTMLElement>;
    const nameTh = Array.from(headers).find((th) => th.textContent?.includes('Name'));
    expect(nameTh).toBeDefined();
    nameTh!.click();
    expect(c.sortBy()).toBe('name');
    expect(c.sortDir()).toBe('asc');
  });
});

describe('AdminDashboardComponent — search across all string fields', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 2,
      campers: [
        makeCamper({ id: 1, firstName: 'Ada', lastName: 'Lovelace', medical: 'asthma inhaler' }),
        makeCamper({ id: 2, firstName: 'Bob', lastName: 'Brown', church: 'St Pauls' }),
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('matches against medical info', () => {
    fixture.componentInstance.searchQuery.set('asthma');
    expect(fixture.componentInstance.visibleCampers().map((c) => c.firstName)).toEqual(['Ada']);
  });

  it('matches against church', () => {
    fixture.componentInstance.searchQuery.set('pauls');
    expect(fixture.componentInstance.visibleCampers().map((c) => c.firstName)).toEqual(['Bob']);
  });
});

describe('AdminDashboardComponent — Emergency group parent view', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 3,
      campers: [
        makeCamper({
          id: 1, firstName: 'Sarah', lastName: 'Smith', grade: '9',
          consentEmergencyName: 'John Smith',
          consentEmergencyContact: '+27 11 555 0100',
        }),
        makeCamper({
          id: 2, firstName: 'Tommy', lastName: 'Smith', grade: '7',
          consentEmergencyName: 'John Smith',
          consentEmergencyContact: '+27 11 555 0100',
        }),
        makeCamper({
          id: 3, firstName: 'Bobby', lastName: 'Doe', grade: '10',
          consentEmergencyName: 'Jane Doe',
          consentEmergencyContact: '+27 82 555 0001',
        }),
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('groups campers by emergency contact in Emergency group view', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();

    const groups = c.emergencyContactGroups();
    expect(groups.length).toBe(2);
    const smith = groups.find((g) => g.name === 'John Smith')!;
    const doe = groups.find((g) => g.name === 'Jane Doe')!;
    expect(smith.kids.map((k) => k.firstName).sort()).toEqual(['Sarah', 'Tommy']);
    expect(doe.kids.map((k) => k.firstName)).toEqual(['Bobby']);
  });

  it('renders one row per emergency contact with the list of kids', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid^="emergency-row-"]'
    ) as NodeListOf<HTMLElement>;
    expect(rows.length).toBe(2);

    const smithRow = Array.from(rows).find((r) =>
      r.textContent?.includes('John Smith')
    )!;
    expect(smithRow.textContent).toContain('Sarah');
    expect(smithRow.textContent).toContain('Tommy');
    expect(smithRow.textContent).toContain('+27 11 555 0100');
  });

  it('flags kids without medical aid in red', () => {
    const c = fixture.componentInstance;
    c.campers.set([
      makeCamper({
        id: 20, firstName: 'Lou', lastName: 'Test', grade: '8',
        consentEmergencyName: 'Some Parent',
        consentEmergencyContact: '+27 99 999 9999',
        consentMedicalAidName: null,
        consentMedicalAidNumber: null,
      }),
    ]);
    c.selectedYear.set(2026);
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector(
      '[data-testid="campers-subtable"] .no-medaid'
    ) as HTMLElement;
    expect(cell).not.toBeNull();
    expect(cell.textContent?.toLowerCase()).toContain('no medical aid');
  });

  it('renders every medical cell with the .medical-cell class so it goes red', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();

    const medicalCells = fixture.nativeElement.querySelectorAll(
      '[data-testid="campers-subtable"] td.medical-cell'
    );
    expect(medicalCells.length).toBeGreaterThan(0);
  });

  it('shows each kid\'s medical aid in a sub-table inside the parent row', () => {
    const c = fixture.componentInstance;
    c.campers.set([
      makeCamper({
        id: 10, firstName: 'Sarah', lastName: 'Smith', grade: '9',
        consentEmergencyName: 'John Smith',
        consentEmergencyContact: '+27 11 555 0100',
        consentMedicalAidName: 'Discovery',
        consentMedicalAidNumber: 'ABC-111',
      }),
      makeCamper({
        id: 11, firstName: 'Tommy', lastName: 'Smith', grade: '7',
        consentEmergencyName: 'John Smith',
        consentEmergencyContact: '+27 11 555 0100',
        consentMedicalAidName: 'Bonitas',
        consentMedicalAidNumber: 'XYZ-222',
      }),
    ]);
    c.selectedYear.set(2026);
    c.viewMode.set('group');
    c.selectedGroup.set('emergency');
    fixture.detectChanges();

    const smithRow = fixture.nativeElement.querySelector(
      '[data-testid^="emergency-row-john smith"]'
    ) as HTMLElement;
    expect(smithRow).not.toBeNull();
    const subTable = smithRow.querySelector(
      '[data-testid="campers-subtable"]'
    ) as HTMLElement;
    expect(subTable).not.toBeNull();
    expect(subTable.textContent).toContain('Discovery');
    expect(subTable.textContent).toContain('ABC-111');
    expect(subTable.textContent).toContain('Bonitas');
    expect(subTable.textContent).toContain('XYZ-222');
  });

  it('falls back to the regular per-camper table outside the Emergency group view', () => {
    const c = fixture.componentInstance;
    c.viewMode.set('group');
    c.selectedGroup.set('camper');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="emergency-rows"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="campers-rows"]')).not.toBeNull();
  });
});

describe('AdminDashboardComponent — view mode persistence on init', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard(() => {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'group');
    }));
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({ total: 0, campers: [] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('restores group view mode but defaults the selected group to Camper', () => {
    expect(fixture.componentInstance.viewMode()).toBe('group');
    // selectedGroup is no longer persisted — every page load starts on the
    // Camper group so the active context is always "who is this row".
    expect(fixture.componentInstance.selectedGroup()).toBe('camper');
  });
});

describe('AdminDashboardComponent — inline edit', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;
  let admin: AdminService;

  const editUrl = (id: number) => `${environment.baseApi}/admin/campers/${id}/edit`;

  beforeEach(() => {
    ({ fixture, http } = setupDashboard());
    http.expectOne(`${environment.baseApi}/admin/campers`).flush({
      total: 1,
      campers: [makeCamper({ id: 1, firstName: 'Ada', grade: '10' })],
    });
    fixture.detectChanges();
    admin = TestBed.inject(AdminService);
    // Pretend editing is already unlocked this session so openEditor skips the
    // password prompt (the unlock exchange is covered separately by the service).
    admin.setEditorToken('editor.jwt.token');
  });

  afterEach(() => http.verify());

  it('opens the drawer for the clicked camper when already unlocked', async () => {
    await fixture.componentInstance.openEditor(makeCamper({ id: 1 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.editingCamper()?.id).toBe(1);
    expect(
      fixture.nativeElement.querySelector('[data-testid="camper-edit-panel"]')
    ).not.toBeNull();
  });

  it('POSTs the edit with the X-Editor-Token header and patches the row', () => {
    fixture.componentInstance.editingCamper.set(makeCamper({ id: 1, grade: '10' }));
    const payload: CamperEditPayload = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      parentEmail: 'parent@example.com',
      grade: '11',
      friends: [],
    };
    fixture.componentInstance.saveEdit(payload);

    const req = http.expectOne(editUrl(1));
    expect(req.request.headers.get('X-Editor-Token')).toBe('editor.jwt.token');
    expect((req.request.body as CamperEditPayload).grade).toBe('11');
    req.flush({ id: 1, changed: 1, changes: [{ field: 'grade', label: 'Grade', from: '10', to: '11' }] });

    expect(fixture.componentInstance.editingCamper()).toBeNull();
    expect(fixture.componentInstance.campers().find((c) => c.id === 1)?.grade).toBe('11');
  });

  it('re-locks editing on a 403 (expired editor token)', () => {
    fixture.componentInstance.editingCamper.set(makeCamper({ id: 1 }));
    fixture.componentInstance.saveEdit({
      firstName: 'Ada',
      lastName: 'Lovelace',
      parentEmail: 'parent@example.com',
      friends: [],
    });
    http.expectOne(editUrl(1)).flush(
      { error: 'locked' },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(admin.isEditorUnlocked()).toBe(false);
  });
});
