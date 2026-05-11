import { Component, OnInit, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SagaSelectComponent, SagaSelectOption } from '../saga-select/saga-select.component';

/**
 * Hybrid date picker:
 *   • mobile (< sm) — native <input type="date"> (great wheel/calendar UI on
 *     iOS / Android)
 *   • desktop (≥ sm) — three independent selects (Day / Month / Year). The
 *     native picker is awkward on a wide screen for distant DOBs.
 *
 * Both views write the same ISO YYYY-MM-DD string back to the bound
 * FormControl, so consumers don't care which view the user touched.
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, SagaSelectComponent],
  template: `
    <input
      type="date"
      [formControl]="control()"
      [attr.min]="min()"
      [attr.max]="max()"
      class="sm:hidden block w-full rounded-lg px-3 py-2"
      style="cursor: pointer;"
      [attr.data-testid]="'date-picker-mobile'"
    />

    <div class="hidden sm:grid grid-cols-3 gap-2" [attr.data-testid]="'date-picker-desktop'">
      <app-saga-select
        [control]="dayControl"
        [options]="dayOptions()"
        placeholder="Day"
      ></app-saga-select>
      <app-saga-select
        [control]="monthControl"
        [options]="monthOptions"
        placeholder="Month"
      ></app-saga-select>
      <app-saga-select
        [control]="yearControl"
        [options]="yearOptions()"
        placeholder="Year"
      ></app-saga-select>
    </div>
  `,
})
export class DatePickerComponent implements OnInit {
  control = input.required<FormControl>();
  min = input<string | null>(null);
  max = input<string | null>(null);
  /** Year range, default = current year back 80 years. Camper DOBs sit
   * inside the most-recent 18 years of this, but the same picker is
   * reused on /leader-register where adult leaders (Neil born 1975 etc.)
   * need their birth year to be selectable too. Callers that want a
   * tighter range can pass `yearsRange` explicitly. */
  yearsRange = input<{ from: number; to: number } | null>(null);

  readonly monthOptions: SagaSelectOption[] = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Each desktop sub-select drives its own FormControl; their combined value
  // gets committed to the bound parent control as YYYY-MM-DD whenever all
  // three are set. Persists partial selections (e.g. user picks Year first).
  readonly dayControl = new FormControl<string>('');
  readonly monthControl = new FormControl<string>('');
  readonly yearControl = new FormControl<string>('');

  dayOptions = (): SagaSelectOption[] =>
    Array.from({ length: 31 }, (_, i) => {
      const v = String(i + 1).padStart(2, '0');
      return { value: v, label: v };
    });

  yearOptions = (): SagaSelectOption[] => {
    const range = this.yearsRange();
    const from = range?.from ?? new Date().getFullYear() - 80;
    const to = range?.to ?? new Date().getFullYear();
    const out: SagaSelectOption[] = [];
    for (let y = to; y >= from; y--) {
      const v = String(y);
      out.push({ value: v, label: v });
    }
    return out;
  };

  ngOnInit(): void {
    // Seed all three sub-controls from any existing draft value.
    this.hydrateFromControl(this.control().value);
    this.control().valueChanges.subscribe((v: unknown) => this.hydrateFromControl(v));

    // Re-emit a combined ISO date whenever any sub-control changes.
    this.dayControl.valueChanges.subscribe(() => this.maybeCommit());
    this.monthControl.valueChanges.subscribe(() => this.maybeCommit());
    this.yearControl.valueChanges.subscribe(() => this.maybeCommit());
  }

  private hydrateFromControl(v: unknown): void {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      this.yearControl.setValue(v.substring(0, 4), { emitEvent: false });
      this.monthControl.setValue(v.substring(5, 7), { emitEvent: false });
      this.dayControl.setValue(v.substring(8, 10), { emitEvent: false });
    }
  }

  private maybeCommit(): void {
    const y = this.yearControl.value;
    const m = this.monthControl.value;
    const d = this.dayControl.value;
    if (y && m && d) {
      this.control().setValue(`${y}-${m}-${d}`);
    } else {
      this.control().setValue('');
    }
  }
}
