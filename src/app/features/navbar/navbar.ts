import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  readonly currentUser = this.usersService.currentUser;
  readonly unreadCount = signal<number>(0);
  readonly searchQuery = signal<string>('');
  readonly isMobileSearchOpen = signal<boolean>(false);

  readonly defaultPhoto =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  ngOnInit(): void {
    this.initCurrentUser();
    this.initUnreadCount();
    this.listenToSearchQueryParam();
  }

  private listenToSearchQueryParam(): void {
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q');
      this.searchQuery.set(q ?? '');
    });
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
    } else {
      this.clearSearch();
    }
    this.isMobileSearchOpen.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.router.navigate(['/home'], {
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleMobileSearch(): void {
    this.isMobileSearchOpen.update((open) => !open);
  }
}

export { NavbarComponent as Navbar };

