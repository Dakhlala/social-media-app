import { Routes } from '@angular/router';
import { isAllowedAuthGuard } from './core/auth/guards/is-allowed-auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },

  {
    path: '',
    loadComponent: () => import('./layout/auth/auth').then((m) => m.Auth),
    children: [
      {
        path: 'sign-up',
        loadComponent: () =>
          import('./features/sign-up/sign-up.component').then((m) => m.SignUpComponent),
      },
      {
        path: 'sign-in',
        loadComponent: () =>
          import('./features/sign-in/sign-in.component').then((m) => m.SignInComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main/main').then((m) => m.Main),
    children: [
      {
        path: 'home',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/home-feed/home-feed.component').then((m) => m.HomeFeedComponent),
      },
      {
        path: 'notifications',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent
          ),
      },
      {
        path: 'archives',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/archives/archives.component').then((m) => m.ArchivesComponent),
      },
      {
        path: 'author',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/author-profile/author-profile.component').then(
            (m) => m.AuthorProfileComponent
          ),
      },
      {
        path: 'author/:id',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/author-profile/author-profile.component').then(
            (m) => m.AuthorProfileComponent
          ),
      },
      {
        path: 'change-password',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent
          ),
      },
      {
        path: 'post-detail',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/post-detail/post-detail.component').then(
            (m) => m.PostDetailComponent
          ),
      },
      {
        path: 'post-detail/:id',
        canActivate: [isAllowedAuthGuard],
        loadComponent: () =>
          import('./features/post-detail/post-detail.component').then(
            (m) => m.PostDetailComponent
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
