import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '../../core/auth/services/auth';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {


  private readonly router = inject(Router)

  // service injection
  private readonly auth = inject(Auth)
  private readonly toastService = inject(ToastService);

  //flag
  isLoading = signal<boolean>(false)

  // signup form
  signUpForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    username: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    dateOfBirth: new FormControl('', [Validators.required]),
    gender: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]),
    rePassword: new FormControl('', [Validators.required]),
  }, { validators: this.confirmPassword })

  // password error messages using signals
  private passwordValue = toSignal(this.signUpForm.controls.password.valueChanges, { initialValue: '' })
  private repasswordValue = toSignal(this.signUpForm.controls.rePassword.valueChanges, { initialValue: '' })
  passwordsMatch = computed(() => {
    const pass = this.passwordValue();
    const rePass = this.repasswordValue();
    return Boolean(pass && rePass && pass === rePass);
  });

  // siganls and computed signals

  isStarted = computed(() => (this.passwordValue()?.length ?? 0) > 0);

  hasMinLength = computed(() => (this.passwordValue()?.length ?? 0) >= 8);

  hasNumber = computed(() => /\d/.test(this.passwordValue() ?? ''));

  hasSymbols = computed(() => /[@$!%*?&]/.test(this.passwordValue() ?? ''));

  isSubmitted = signal(false);

  shouldShowStatus = computed(() => this.isStarted() || this.isSubmitted());

  getBadgeClass(isValid: boolean) {
    if (!this.shouldShowStatus()) {
      return 'bg-surface-container text-secondary border-outline-variant'
    }
    return isValid
      ? 'bg-surface-container text-primary border-outline-variant'
      : 'bg-error-container text-on-error-container border-error/30';
  }

  getBadgeIcon(isValid: boolean): string {
    if (!this.shouldShowStatus()) {
      return '';
    }
    return isValid ? 'check' : 'close';
  }

  onSubmit(): void {
    this.isSubmitted.set(true);
    if (this.signUpForm.valid) {
      this.isLoading.set(true);
      this.auth.signUp(this.signUpForm.value).subscribe({
        next: (res) => {
          this.toastService.success(
            'Welcome to The Commons!',
            res?.message || 'Your author account has been created successfully!'
          );
          this.signUpForm.reset();
          this.isSubmitted.set(false);
          this.router.navigate(['/sign-in']);
        },
        error: () => {
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.signUpForm.markAllAsTouched();
      this.toastService.warning('Incomplete Form', 'Please review all required fields and try again.');
    }
  }

  confirmPassword(form: AbstractControl) {
    if (form.get('password')?.value !== form.get('rePassword')?.value) {
      form.get('rePassword')?.setErrors({ mismatch: true })
      return { mismatch: true }
    }
    else {
      return null
    }
  }

  showPassword(password: any) {
    if (password.type == "password") {
      password.type = "text"
    }
    else {
      password.type = "password"
    }
  }
}
