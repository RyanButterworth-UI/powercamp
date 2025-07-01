import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampAdditionalInfoComponent } from './camp-additional-info.component';

describe('CampAdditionalInfoComponent', () => {
  let component: CampAdditionalInfoComponent;
  let fixture: ComponentFixture<CampAdditionalInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampAdditionalInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CampAdditionalInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
