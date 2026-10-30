import { Component, OnInit, inject, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UsersService } from '../../../core/services/users-service';
import { NotificationsService } from '../../../core/services/notifications-service';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly currentUser = this.usersService.currentUser;
  readonly unreadCount = signal<number>(0);

  readonly newEntry = output<void>();

  readonly defaultPhoto =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUnreadCount();
  }

  private loadCurrentUser(): void {
    if (!this.currentUser()) {
      this.usersService.getMyProfile().subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }

  private loadUnreadCount(): void {
    this.notificationsService.getUnreadCount().subscribe({
      next: (res) => {
        const count = res.data?.unreadCount ?? (res as any).unreadCount ?? 0;
        this.unreadCount.set(count);
      },
      error: () => {},
    });
  }

  onNewEntryClick(): void {
    this.newEntry.emit();
    const currentPath = this.router.url.split('?')[0];
    if (currentPath !== '/home') {
      this.router.navigate(['/home'], { queryParams: { compose: true } });
    } else {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  onSignOut(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    this.usersService.currentUser.set(null);
    this.toastService.info('Signed Out', 'You have been signed out of Gather.');
    this.router.navigate(['/sign-in']);
  }

  onPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.defaultPhoto) {
      img.src = this.defaultPhoto;
    }
  }
}

export { SidebarComponent as Sidebar };
