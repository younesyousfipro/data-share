import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Download } from './features/download/download';
import { MyFiles } from './features/my-files/my-files';
import { Upload } from './features/upload/upload';

export const routes: Routes = [
  { path: '', component: Upload, canActivate: [authGuard], title: 'Ajouter un fichier - DataShare' },
  { path: 'register', component: Register, title: 'Créer un compte - DataShare' },
  { path: 'login', component: Login, title: 'Connexion - DataShare' },
  { path: 'my-files', component: MyFiles, canActivate: [authGuard], title: 'Mes fichiers - DataShare' },
  // Public: the recipient of a share link needs no account
  { path: 'download/:id', component: Download, title: 'Télécharger un fichier - DataShare' },
  // Unknown URL: the home page instead of an empty page
  { path: '**', redirectTo: '' },
];
