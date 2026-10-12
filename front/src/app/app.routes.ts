import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Upload } from './features/upload/upload';

export const routes: Routes = [
  { path: '', component: Upload, canActivate: [authGuard], title: 'Ajouter un fichier - DataShare' },
  { path: 'register', component: Register, title: 'Créer un compte - DataShare' },
  { path: 'login', component: Login, title: 'Connexion - DataShare' },
];
