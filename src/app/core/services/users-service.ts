import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, User } from '../models/api.models';
import { SuggestionsResponseData, PostsResponseData } from '../models/post.models';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly httpClient = inject(HttpClient);

  readonly currentUser = signal<User | null>(this.getInitialUser());

  private getInitialUser(): User | null {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  updateCurrentUser(user: User): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch {}
  }

  private get authHeaders(): { headers: { [header: string]: string } } {
    const token = localStorage.getItem('userToken') || '';
    return {
      headers: {
        token: token,
        AUTHORIZATION: `Bearer ${token}`,
      },
    };
  }

  // Get author follow suggestions
  getSuggestions(limit: number = 5): Observable<ApiResponse<SuggestionsResponseData>> {
    return this.httpClient.get<ApiResponse<SuggestionsResponseData>>(
      `${environment.baseUrl}/users/suggestions?limit=${limit}`,
      this.authHeaders
    );
  }

  // Follow or unfollow a user
  toggleFollow(userId: string): Observable<ApiResponse<any>> {
    return this.httpClient.put<ApiResponse<any>>(
      `${environment.baseUrl}/users/${userId}/follow`,
      {},
      this.authHeaders
    );
  }

  // Get current user profile data
  getMyProfile(): Observable<ApiResponse<{ user: User }>> {
    return this.httpClient
      .get<ApiResponse<{ user: User }>>(
        `${environment.baseUrl}/users/profile-data`,
        this.authHeaders
      )
      .pipe(
        tap((res) => {
          const u = res.data?.user || (res as any).user;
          if (u) {
            this.updateCurrentUser(u);
          }
        })
      );
  }

  // Get specific author profile by ID
  getUserProfile(userId: string): Observable<ApiResponse<{ user: User }>> {
    return this.httpClient.get<ApiResponse<{ user: User }>>(
      `${environment.baseUrl}/users/${userId}/profile`,
      this.authHeaders
    );
  }

  // Get specific author's posts by ID
  getUserPosts(userId: string, page: number = 1, limit: number = 20): Observable<ApiResponse<PostsResponseData>> {
    return this.httpClient.get<ApiResponse<PostsResponseData>>(
      `${environment.baseUrl}/users/${userId}/posts?page=${page}&limit=${limit}`,
      this.authHeaders
    );
  }

  // Get current user bookmarked posts (Preserved Archives)
  getBookmarks(): Observable<ApiResponse<any>> {
    return this.httpClient.get<ApiResponse<any>>(
      `${environment.baseUrl}/users/bookmarks`,
      this.authHeaders
    );
  }

  // Upload and update user profile photo
  uploadProfilePhoto(file: File): Observable<ApiResponse<{ photo: string }>> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.httpClient
      .put<ApiResponse<{ photo: string }>>(
        `${environment.baseUrl}/users/upload-photo`,
        formData,
        this.authHeaders
      )
      .pipe(
        tap((res) => {
          const newPhoto = res.data?.photo || (res as any).photo;
          const current = this.currentUser();
          if (newPhoto && current) {
            this.updateCurrentUser({ ...current, photo: newPhoto });
          }
        })
      );
  }
}

