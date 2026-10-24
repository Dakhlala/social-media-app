import { Routes } from '@angular/router';
import { SignUpComponent } from './features/sign-up/sign-up.component';
import { SignInComponent } from './features/sign-in/sign-in.component';
import { HomeFeedComponent } from './features/home-feed/home-feed.component';
import { AuthorProfileComponent } from './features/author-profile/author-profile.component';
import { PostDetailComponent } from './features/post-detail/post-detail.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { ArchivesComponent } from './features/archives/archives.component';
import { isAllowedAuthGuard } from './core/auth/guards/is-allowed-auth-guard';
import { Auth } from './layout/auth/auth';
import { Main } from './layout/main/main';

export const routes: Routes = [


    { path: "", redirectTo: 'sign-in', pathMatch: "full" },


    {
        path: "", component: Auth, children: [
            { path: "sign-up", component: SignUpComponent },
            { path: "sign-in", component: SignInComponent }
        ]
    },
    {
        path: "", component: Main, children: [

            { path: "home", canActivate: [isAllowedAuthGuard], component: HomeFeedComponent },
            { path: "notifications", canActivate: [isAllowedAuthGuard], component: NotificationsComponent },
            { path: "archives", canActivate: [isAllowedAuthGuard], component: ArchivesComponent },
            { path: "author", canActivate: [isAllowedAuthGuard], component: AuthorProfileComponent },
            { path: "author/:id", canActivate: [isAllowedAuthGuard], component: AuthorProfileComponent },
            { path: "post-detail", canActivate: [isAllowedAuthGuard], component: PostDetailComponent },
            { path: "post-detail/:id", canActivate: [isAllowedAuthGuard], component: PostDetailComponent }


        ]
    }

];
