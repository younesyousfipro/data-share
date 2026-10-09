import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
    if (this.form.invalid) {
      return;
    }
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
