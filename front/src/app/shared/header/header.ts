import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isLoggedIn = this.authService.isLoggedIn;

  // The JWT is only forgotten by the browser: the API keeps no session to close, see SECURITY.md
  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
