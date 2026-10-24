import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ɵInternalFormsSharedModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/services/auth';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  templateUrl: './sign-in.component.html',
  imports: [ɵInternalFormsSharedModule, ReactiveFormsModule, RouterLink],
})
export class SignInComponent {


  private readonly router = inject(Router)

  // service injection
  private readonly auth = inject(Auth)
  private readonly toastService = inject(ToastService);

  //flag
  isLoading = signal<boolean>(false)

  // signIn form 
  signInForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]),
  })


  isSubmitted = signal(false);


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

          this.toastService.success('Welcome back!', res?.message || 'Signed in to Gather successfully.');
          this.signInForm.reset();
          this.isSubmitted.set(false);
          this.router.navigate(['/home'])
        },
        error: () => {
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.signInForm.markAllAsTouched();
      this.toastService.error('Invalid Credentials', 'Please provide a valid email and password.');
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
