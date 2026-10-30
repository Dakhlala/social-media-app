import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/services/auth';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  templateUrl: './sign-in.component.html',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class SignInComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);

  // Quill Typewriter Headline Animation
  readonly fullHeadline = 'Welcome back to the dialogue.';
  readonly typedHeadline = signal<string>('');
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
    this.typedHeadline.set('');
    this.isTyping.set(true);
    let idx = 0;
    this.typewriterTimer = setInterval(() => {
      if (idx < this.fullHeadline.length) {
        this.typedHeadline.update((text) => text + this.fullHeadline.charAt(idx));
        idx++;
      } else {
        this.isTyping.set(false);
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
    }, 38);
  }

  readonly signInForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.isSubmitted.set(true);
    if (this.signInForm.valid) {
      this.isLoading.set(true);
      this.auth.signIn(this.signInForm.value).subscribe({
        next: (res) => {
          if (res?.data?.token) {
            localStorage.setItem('userToken', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }

          this.toastService.success(
            'Welcome back!',
            res?.message || 'Signed in to Gather successfully.',
          );
          this.signInForm.reset();
          this.isSubmitted.set(false);
          this.router.navigate(['/home']);
        },
        error: () => {
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
    } else {
      this.signInForm.markAllAsTouched();
      this.toastService.error('Invalid Credentials', 'Please provide a valid email and password.');
    }
  }
}
