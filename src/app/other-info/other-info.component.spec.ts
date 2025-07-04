import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherInfoComponent } from './other-info.component';

describe('OtherInfoComponent', () => {
  let component: OtherInfoComponent;
  let fixture: ComponentFixture<OtherInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtherInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
