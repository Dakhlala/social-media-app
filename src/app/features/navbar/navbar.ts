import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users-service';
import { NotificationsService } from '../../core/services/notifications-service';
import { User } from '../../core/models/api.models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly currentUser = this.usersService.currentUser;
  readonly unreadCount = signal<number>(0);
  readonly searchQuery = signal<string>('');

  readonly defaultPhoto =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  ngOnInit(): void {
    this.initCurrentUser();
    this.initUnreadCount();
  }

  private initCurrentUser(): void {
    this.usersService.getMyProfile().subscribe({
      next: () => {},
      error: () => {},
    });
  }

  private initUnreadCount(): void {
    this.notificationsService.getUnreadCount().subscribe({
      next: (res) => {
        const count = res.data?.unreadCount ?? (res as any).unreadCount ?? 0;
        this.unreadCount.set(count);
      },
      error: () => {},
    });
  }

  onSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/home'], { queryParams: { q } });
    }
  }
}

export { NavbarComponent as Navbar };

