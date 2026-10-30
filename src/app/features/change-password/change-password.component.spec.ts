import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangePasswordComponent } from './change-password.component';
import { UsersService } from '../../core/services/users-service';
import { ToastService } from '../../core/services/toast-service';
import { of, throwError } from 'rxjs';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let usersService: UsersService;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form and invalid state', () => {
    expect(component.changePasswordForm.valid).toBe(false);
  });

  it('should validate password mismatch', () => {
    component.changePasswordForm.patchValue({
      password: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      rePassword: 'DifferentPassword123!',
    });

    expect(component.changePasswordForm.hasError('mismatch')).toBe(true);
    expect(component.changePasswordForm.valid).toBe(false);
  });

  it('should validate matching strong password', () => {
    component.changePasswordForm.patchValue({
      password: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      rePassword: 'NewPassword123!',
    });

    expect(component.changePasswordForm.hasError('mismatch')).toBe(false);
    expect(component.changePasswordForm.valid).toBe(true);
  });

  it('should toggle password visibility flags', () => {
    expect(component.showCurrentPassword()).toBe(false);
    component.toggleCurrentPassword();
    expect(component.showCurrentPassword()).toBe(true);

    expect(component.showNewPassword()).toBe(false);
    component.toggleNewPassword();
    expect(component.showNewPassword()).toBe(true);

    expect(component.showRePassword()).toBe(false);
    component.toggleRePassword();
    expect(component.showRePassword()).toBe(true);
  });

  it('should submit successfully, update token, and navigate to /author', () => {
    component.changePasswordForm.patchValue({
      password: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      rePassword: 'NewPassword123!',
    });

    const changePasswordSpy = vi.spyOn(usersService, 'changePassword').mockReturnValue(
      of({ success: true, message: 'Password changed', token: 'new-jwt-token' } as any)
    );
    const toastSpy = vi.spyOn(toastService, 'success');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSubmit();

    expect(changePasswordSpy).toHaveBeenCalledWith({
      password: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    });
    expect(localStorage.getItem('userToken')).toBe('new-jwt-token');
    expect(toastSpy).toHaveBeenCalledWith('Security Key Updated', expect.any(String));
    expect(navigateSpy).toHaveBeenCalledWith(['/author']);
  });
});

