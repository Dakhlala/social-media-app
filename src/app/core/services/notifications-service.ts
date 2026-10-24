import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { NotificationItem, NotificationsResponseData } from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
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

  // Get notifications list with optional unread filter and pagination
  getNotifications(
    unread: boolean = false,
    page: number = 1,
    limit: number = 10
  ): Observable<ApiResponse<NotificationsResponseData | NotificationItem[]>> {
    return this.httpClient.get<ApiResponse<NotificationsResponseData | NotificationItem[]>>(
      `${environment.baseUrl}/notifications?unread=${unread}&page=${page}&limit=${limit}`,
      this.authHeaders
    );
  }

  // Get unread notification count
  getUnreadCount(): Observable<ApiResponse<{ unreadCount: number }>> {
    return this.httpClient.get<ApiResponse<{ unreadCount: number }>>(
      `${environment.baseUrl}/notifications/unread-count`,
      this.authHeaders
    );
  }

  // Mark single notification as read
  markAsRead(notificationId: string): Observable<ApiResponse<any>> {
    return this.httpClient.patch<ApiResponse<any>>(
      `${environment.baseUrl}/notifications/${notificationId}/read`,
      {},
      this.authHeaders
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<ApiResponse<any>> {
    return this.httpClient.patch<ApiResponse<any>>(
      `${environment.baseUrl}/notifications/read-all`,
      {},
      this.authHeaders
    );
  }
}
