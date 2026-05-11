import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FormComponent } from './form.component';

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    // FormComponent constructs its rootFormGroup eagerly and fires the
    // ready setTimeout / restoreDraft pipeline. We don't trigger
    // detectChanges so the children (which need their own HTTP / router
    // setup) don't render — just assert the host wires up cleanly.
  });

  it('should create with the camper form group ready', () => {
    expect(component).toBeTruthy();
    expect(component.rootFormGroup).toBeTruthy();
    expect(component.rootFormGroup.contains('firstName')).toBe(true);
    expect(component.rootFormGroup.contains('parentEmail')).toBe(true);
  });
});
