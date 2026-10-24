import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { PostsResponseData, Post, PostComment, CommentsResponseData } from '../models/post.models';

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private readonly httpClient = inject(HttpClient);

  private get authHeaders(): { headers: { [header: string]: string } } {
    const token = localStorage.getItem('userToken') || '';
    return {
      headers: {
        token: token,
        AUTHORIZATION: `Bearer ${token}`,
      },
    };
  }

  // Get all community posts with pagination
  getAllPosts(page: number = 1, limit: number = 10): Observable<ApiResponse<PostsResponseData>> {
    return this.httpClient.get<ApiResponse<PostsResponseData>>(
      `${environment.baseUrl}/posts?page=${page}&limit=${limit}`,
      this.authHeaders
    );
  }

  // Get following posts with pagination
  getHomeFeed(page: number = 1, limit: number = 10): Observable<ApiResponse<PostsResponseData>> {
    return this.httpClient.get<ApiResponse<PostsResponseData>>(
      `${environment.baseUrl}/posts/feed?only=following&page=${page}&limit=${limit}`,
      this.authHeaders
    );
  }

  // Create a new post (supports multipart FormData with body and image)
  createPost(data: FormData | object): Observable<ApiResponse<{ post: Post }>> {
    return this.httpClient.post<ApiResponse<{ post: Post }>>(
      `${environment.baseUrl}/posts`,
      data,
      this.authHeaders
    );
  }

  // Like or unlike a post
  toggleLike(postId: string): Observable<ApiResponse<any>> {
    return this.httpClient.put<ApiResponse<any>>(
      `${environment.baseUrl}/posts/${postId}/like`,
      {},
      this.authHeaders
    );
  }

  // Bookmark or unbookmark a post
  toggleBookmark(postId: string): Observable<ApiResponse<any>> {
    return this.httpClient.put<ApiResponse<any>>(
      `${environment.baseUrl}/posts/${postId}/bookmark`,
      {},
      this.authHeaders
    );
  }

  // Get single post by ID
  getSinglePost(postId: string): Observable<ApiResponse<{ post: Post }>> {
    return this.httpClient.get<ApiResponse<{ post: Post }>>(
      `${environment.baseUrl}/posts/${postId}`,
      this.authHeaders
    );
  }

  // Update an existing post (supports multipart FormData or object)
  updatePost(postId: string, data: FormData | object): Observable<ApiResponse<{ post: Post }>> {
    return this.httpClient.put<ApiResponse<{ post: Post }>>(
      `${environment.baseUrl}/posts/${postId}`,
      data,
      this.authHeaders
    );
  }

  // Delete a post
  deletePost(postId: string): Observable<ApiResponse<any>> {
    return this.httpClient.delete<ApiResponse<any>>(
      `${environment.baseUrl}/posts/${postId}`,
      this.authHeaders
    );
  }

  // Get comments for a post
  getPostComments(postId: string, page: number = 1, limit: number = 20): Observable<ApiResponse<CommentsResponseData>> {
    return this.httpClient.get<ApiResponse<CommentsResponseData>>(
      `${environment.baseUrl}/posts/${postId}/comments?page=${page}&limit=${limit}`,
      this.authHeaders
    );
  }

  // Create a comment on a post
  createComment(postId: string, data: { content: string } | FormData): Observable<ApiResponse<{ comment: PostComment }>> {
    return this.httpClient.post<ApiResponse<{ comment: PostComment }>>(
      `${environment.baseUrl}/posts/${postId}/comments`,
      data,
      this.authHeaders
    );
  }

  // Delete a comment
  deleteComment(commentId: string): Observable<ApiResponse<any>> {
    return this.httpClient.delete<ApiResponse<any>>(
      `${environment.baseUrl}/posts/comments/${commentId}`,
      this.authHeaders
    );
  }

  // Like or unlike a comment
  toggleLikeComment(commentId: string): Observable<ApiResponse<any>> {
    return this.httpClient.put<ApiResponse<any>>(
      `${environment.baseUrl}/posts/comments/${commentId}/like`,
      {},
      this.authHeaders
    );
  }
}

