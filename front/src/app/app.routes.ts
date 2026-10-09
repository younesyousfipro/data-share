import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';

export const routes: Routes = [
  // Temporary: the home page arrives with US01
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: Register, title: 'Créer un compte - DataShare' },
  { path: 'login', component: Login, title: 'Connexion - DataShare' },
];
