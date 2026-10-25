import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/services/auth';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  templateUrl: './sign-up.component.html',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class SignUpComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly showRePassword = signal<boolean>(false);

  // Quill Typewriter Title Animation
  readonly fullTitle = 'Join The Commons';
  readonly typedTitle = signal<string>('');
  readonly isTyping = signal<boolean>(true);
  private typewriterTimer: any = null;

  ngOnInit(): void {
    this.startTypewriter();
  }

  ngOnDestroy(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
    }
  }

  private startTypewriter(): void {
    this.typedTitle.set('');
    this.isTyping.set(true);
    let idx = 0;
    this.typewriterTimer = setInterval(() => {
      if (idx < this.fullTitle.length) {
        this.typedTitle.update((text) => text + this.fullTitle.charAt(idx));
        idx++;
      } else {
        this.isTyping.set(false);
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
    }, 45);
  }

  readonly signUpForm = new FormGroup(
    {
      name: new FormControl('', [Validators.required, Validators.minLength(3)]),
      username: new FormControl(''),
      email: new FormControl('', [Validators.required, Validators.email]),
      dateOfBirth: new FormControl('', [Validators.required]),
      gender: new FormControl('female', [Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
      ]),
      rePassword: new FormControl('', [Validators.required]),
    },
    { validators: this.confirmPassword }
  );

  private passwordValue = toSignal(this.signUpForm.controls.password.valueChanges, { initialValue: '' });
  private repasswordValue = toSignal(this.signUpForm.controls.rePassword.valueChanges, { initialValue: '' });

  passwordsMatch = computed(() => {
    const pass = this.passwordValue();
    const rePass = this.repasswordValue();
    return Boolean(pass && rePass && pass === rePass);
  });

  isStarted = computed(() => (this.passwordValue()?.length ?? 0) > 0);
  hasMinLength = computed(() => (this.passwordValue()?.length ?? 0) >= 8);
  hasNumber = computed(() => /\d/.test(this.passwordValue() ?? ''));
  hasSymbols = computed(() => /[@$!%*?&]/.test(this.passwordValue() ?? ''));
  shouldShowStatus = computed(() => this.isStarted() || this.isSubmitted());

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleRePassword(): void {
    this.showRePassword.update((v) => !v);
  }

  confirmPassword(form: AbstractControl) {
    const password = form.get('password')?.value;
    const rePassword = form.get('rePassword')?.value;
    if (password && rePassword && password !== rePassword) {
      form.get('rePassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
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
        },
      });
    } else {
      this.signUpForm.markAllAsTouched();
      this.toastService.warning('Incomplete Form', 'Please review all required fields and try again.');
    }
  }
}
