import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

const passwordsMatch: ValidatorFn = (form) =>
  form.get('password')?.value === form.get('confirmPassword')?.value
    ? null
    : { passwordsMismatch: true };

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Guards against a double click, whose second request would get a 409
  private submitting = false;

  protected readonly serverError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(18)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected trimEmail(): void {
    const email = this.form.controls.email;
    email.setValue(email.value.trim());
  }

  protected submit(): void {
    this.trimEmail();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    this.submitting = true;
    this.serverError.set(null);
    const { email, password } = this.form.getRawValue();
    this.authService.register({ email, password }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (error: HttpErrorResponse) => {
        this.submitting = false;
        this.serverError.set(
          error.status === 409
            ? 'Cet email est déjà utilisé.'
            : 'Une erreur est survenue, veuillez réessayer.',
        );
      },
    });
  }

  protected emailError(): string | null {
    const email = this.form.controls.email;
    if (!email.touched || email.valid) {
      return null;
    }
    return email.hasError('required') ? 'Saisissez votre email.' : 'Saisissez un email valide.';
  }

  protected passwordError(): string | null {
    const password = this.form.controls.password;
    if (!password.touched || password.valid) {
      return null;
    }
    return password.hasError('required')
      ? 'Saisissez un mot de passe.'
      : 'Le mot de passe doit contenir entre 8 et 18 caractères.';
  }

  protected confirmPasswordError(): string | null {
    const confirmPassword = this.form.controls.confirmPassword;
    if (!confirmPassword.touched) {
      return null;
    }
    if (confirmPassword.hasError('required')) {
      return 'Confirmez votre mot de passe.';
    }
    return this.form.hasError('passwordsMismatch') ? 'Les mots de passe ne correspondent pas.' : null;
  }
}
