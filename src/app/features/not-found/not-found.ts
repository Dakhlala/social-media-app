import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound implements OnInit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly isAuthenticated = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.isAuthenticated.set(!!localStorage.getItem('userToken'));
    }
  }

  get homeRoute(): string {
    return this.isAuthenticated() ? '/home' : '/sign-in';
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate([this.homeRoute]);
    }
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      if (this.isAuthenticated()) {
        this.router.navigate(['/home'], { queryParams: { q: query } });
      } else {
        this.router.navigate(['/sign-in'], { queryParams: { q: query } });
      }
    }
  }
}

