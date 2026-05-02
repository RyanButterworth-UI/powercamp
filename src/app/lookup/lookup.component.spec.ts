import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LookupComponent } from './lookup.component';
import { LookupResult, StepKey } from '../../models';
import { environment } from '../../environments/environment';

describe('LookupComponent', () => {
  let fixture: ComponentFixture<LookupComponent>;
  let component: LookupComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LookupComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LookupComponent);
    fixture.componentRef.setInput('stepVisible', true);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not call the API when the query is empty', () => {
    component.queryControl.setValue('');
    component.search();
    http.expectNone(`${environment.baseApi}/lookup`);
  });

  it('POSTs to /lookup with the trimmed query and renders results', () => {
    const fakeResults: LookupResult[] = [
      { id: 1, firstName: 'Emma', lastName: 'Cable', year: 2025, parentEmailMasked: 'ji***@me.com' },
    ];

    component.queryControl.setValue('  emma  ');
    component.search();

    const req = http.expectOne(`${environment.baseApi}/lookup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ q: 'emma' });

    req.flush({ results: fakeResults });
    fixture.detectChanges();

    expect(component.results()).toEqual(fakeResults);
    expect(component.loading()).toBe(false);
    const list = fixture.nativeElement.querySelector('[data-testid="results"]');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Emma');
    expect(list.textContent).toContain('Cable');
    expect(list.textContent).toContain('ji***@me.com');
  });

  it('renders the no-results message on an empty array', () => {
    component.queryControl.setValue('zzz');
    component.search();
    http.expectOne(`${environment.baseApi}/lookup`).flush({ results: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="no-results"]')).toBeTruthy();
  });

  it('shows an error and clears loading on HTTP failure', () => {
    component.queryControl.setValue('emma');
    component.search();

    http.expectOne(`${environment.baseApi}/lookup`).flush(
      { error: 'Lookup failed' },
      { status: 500, statusText: 'Server Error' }
    );
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toMatch(/Search failed/i);
    expect(fixture.nativeElement.querySelector('[data-testid="error"]')).toBeTruthy();
  });

  it('emits selectedCamper when "This is me" is clicked', () => {
    const result: LookupResult = {
      id: 7, firstName: 'Emma', lastName: 'Cable', year: 2025, parentEmailMasked: 'ji***@me.com',
    };
    let emitted: LookupResult | undefined;
    component.selectedCamper.subscribe((r) => (emitted = r));

    component.select(result);
    expect(emitted).toEqual(result);
  });

  it('emits goToStep(Intro) when "Register as a new camper" is clicked', () => {
    let emitted: StepKey | undefined;
    component.goToStep.subscribe((s) => (emitted = s));

    component.registerNew();
    expect(emitted).toBe(StepKey.Intro);
  });
});
