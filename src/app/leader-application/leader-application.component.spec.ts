import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaderApplicationComponent } from './leader-application.component';

describe('LeaderApplicationComponent', () => {
  let component: LeaderApplicationComponent;
  let fixture: ComponentFixture<LeaderApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaderApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
