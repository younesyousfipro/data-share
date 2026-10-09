import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

// Same rules as LoginRequestDTO: the password length is checked at registration only
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  protected readonly accountCreated =
    inject(ActivatedRoute).snapshot.queryParamMap.get('registered') === 'true';

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
