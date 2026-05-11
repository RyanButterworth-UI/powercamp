import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ConsentComponent } from './consent.component';

describe('ConsentComponent', () => {
  let component: ConsentComponent;
  let fixture: ComponentFixture<ConsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsentComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsentComponent);
    component = fixture.componentInstance;
    // The legacy /consent page holds rendering behind a 300ms ready hold;
    // flip it manually so its template hydrates synchronously.
    fixture.componentInstance.ready.set(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
