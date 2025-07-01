import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CamperInfoComponent } from './camper-info.component';

describe('CamperInfoComponent', () => {
  let component: CamperInfoComponent;
  let fixture: ComponentFixture<CamperInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CamperInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CamperInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
