import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UsersService } from '../../../core/services/users-service';
import { NotificationsService } from '../../../core/services/notifications-service';
import { User } from '../../../core/models/api.models';

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-bottom-nav.component.html',
})
export class MobileBottomNavComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notificationsService = inject(NotificationsService);

  readonly currentUser = signal<User | null>(null);
  readonly unreadCount = signal<number>(0);

  readonly defaultPhoto =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUnreadNotifications();
  }

  private loadCurrentUser(): void {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        this.currentUser.set(JSON.parse(stored));
      }
    } catch {
      // Fallback
    }

    this.usersService.getMyProfile().subscribe({
      next: (res) => {
        const u = res.data?.user || (res as any).user;
        if (u) {
          this.currentUser.set(u);
          localStorage.setItem('user', JSON.stringify(u));
        }
      },
      error: () => {},
    });
  }

  private loadUnreadNotifications(): void {
    this.notificationsService.getUnreadCount().subscribe({
      next: (res) => {
        const count = res.data?.unreadCount ?? (res as any).unreadCount ?? 0;
        this.unreadCount.set(count);
      },
      error: () => {},
    });
  }
}
