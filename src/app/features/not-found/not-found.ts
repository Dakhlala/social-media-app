import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound implements OnInit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly isAuthenticated = signal<boolean>(false);

  ngOnInit(): void {
    this.isAuthenticated.set(!!localStorage.getItem('userToken'));
  }

  get homeRoute(): string {
    return this.isAuthenticated() ? '/home' : '/sign-in';
  }

  goBack(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate([this.homeRoute]);
    }
  }
}


