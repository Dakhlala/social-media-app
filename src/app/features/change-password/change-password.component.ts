import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsersService } from '../../core/services/users-service';
import { ToastService } from '../../core/services/toast-service';
import { SidebarComponent } from '../../shared/ui/sidebar/sidebar.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SidebarComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);

  readonly showCurrentPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);
  readonly showRePassword = signal<boolean>(false);

  readonly changePasswordForm = new FormGroup(
    {
      password: new FormControl('', [Validators.required]),
      newPassword: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
      ]),
      rePassword: new FormControl('', [Validators.required]),
    },
    { validators: this.confirmPassword }
  );

  private readonly newPasswordValue = toSignal(
    this.changePasswordForm.controls.newPassword.valueChanges,
    { initialValue: '' }
  );
  private readonly repasswordValue = toSignal(
    this.changePasswordForm.controls.rePassword.valueChanges,
    { initialValue: '' }
  );

  readonly passwordsMatch = computed(() => {
    const pass = this.newPasswordValue();
    const rePass = this.repasswordValue();
    return Boolean(pass && rePass && pass === rePass);
  });

  readonly isStarted = computed(() => (this.newPasswordValue()?.length ?? 0) > 0);
  readonly hasMinLength = computed(() => (this.newPasswordValue()?.length ?? 0) >= 8);
  readonly hasNumber = computed(() => /\d/.test(this.newPasswordValue() ?? ''));
  readonly hasSymbols = computed(() => /[@$!%*?&]/.test(this.newPasswordValue() ?? ''));
  readonly shouldShowStatus = computed(() => this.isStarted() || this.isSubmitted());

  toggleCurrentPassword(): void {
    this.showCurrentPassword.update((v) => !v);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleRePassword(): void {
    this.showRePassword.update((v) => !v);
  }

  confirmPassword(form: AbstractControl) {
    const password = form.get('newPassword')?.value;
    const rePassword = form.get('rePassword')?.value;
    const rePasswordControl = form.get('rePassword');

    if (password && rePassword && password !== rePassword) {
      if (!rePasswordControl?.hasError('mismatch')) {
        rePasswordControl?.setErrors({ ...rePasswordControl.errors, mismatch: true });
      }
      return { mismatch: true };
    } else if (rePasswordControl?.hasError('mismatch')) {
      const errors = { ...rePasswordControl.errors };
      delete errors['mismatch'];
      rePasswordControl.setErrors(Object.keys(errors).length ? errors : null);
    }
    return null;
  }

  onSubmit(): void {
    this.isSubmitted.set(true);

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      this.toastService.warning(
        'Incomplete Form',
        'Please review all required fields and password strength requirements.'
      );
      return;
    }

    const { password, newPassword } = this.changePasswordForm.value;
    if (!password || !newPassword) return;

    this.isLoading.set(true);

    this.usersService.changePassword({ password, newPassword }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const newToken = res?.token || res?.data?.token;
        if (newToken) {
          localStorage.setItem('userToken', newToken);
        }

        this.toastService.success(
          'Security Key Updated',
          'Your password has been changed successfully.'
        );
        this.changePasswordForm.reset();
        this.isSubmitted.set(false);
        this.router.navigate(['/author']);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}

