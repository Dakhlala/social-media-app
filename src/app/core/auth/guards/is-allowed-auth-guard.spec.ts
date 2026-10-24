import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { isAllowedAuthGuard } from './is-allowed-auth-guard';

describe('isAllowedAuthGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => isAllowedAuthGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
