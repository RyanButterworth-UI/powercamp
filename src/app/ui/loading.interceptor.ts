import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { UiService } from './ui.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const ui = inject(UiService);
  ui.beginLoading();
  return next(req).pipe(finalize(() => ui.endLoading()));
};
