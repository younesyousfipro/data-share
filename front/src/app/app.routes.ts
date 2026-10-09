import { Routes } from '@angular/router';
import { Register } from './features/auth/register/register';

export const routes: Routes = [
  // Temporary: the home page arrives with US01
  { path: '', redirectTo: 'register', pathMatch: 'full' },
  { path: 'register', component: Register, title: 'Créer un compte - DataShare' },
];
