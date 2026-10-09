import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  protected readonly isLoggedIn = inject(AuthService).isLoggedIn;
}
