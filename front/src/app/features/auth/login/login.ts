import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

// Same rules as LoginRequestDTO: the password length is checked at registration only
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private submitting = false;

  protected readonly serverError = signal<string | null>(null);

  protected readonly infoMessage = infoMessageOf(inject(ActivatedRoute).snapshot.queryParamMap);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

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
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (error: HttpErrorResponse) => {
        this.submitting = false;
        this.serverError.set(
          error.status === 401
            ? 'Email ou mot de passe incorrect.'
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
    return password.touched && password.invalid ? 'Saisissez votre mot de passe.' : null;
  }
}

// Why the user lands here: set by the registration page or by the interceptor on a 401
function infoMessageOf(query: ParamMap): string | null {
  if (query.get('registered') === 'true') {
    return 'Votre compte a été créé, vous pouvez vous connecter.';
  }
  if (query.get('expired') === 'true') {
    return 'Votre session a expiré, veuillez vous reconnecter.';
  }
  return null;
}
