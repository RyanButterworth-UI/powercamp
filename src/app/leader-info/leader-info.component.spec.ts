import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaderInfoComponent } from './leader-info.component';

describe('LeaderInfoComponent', () => {
  let component: LeaderInfoComponent;
  let fixture: ComponentFixture<LeaderInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaderInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
