import { Post } from './post.models';

export interface NotificationActor {
  _id: string;
  name: string;
  username?: string;
  photo?: string;
  role?: string;
}

export interface NotificationRecipient {
  _id: string;
  name: string;
  photo?: string;
}

export interface NotificationEntity {
  _id: string;
  id?: string;
  body?: string;
  name?: string;
  username?: string;
  photo?: string;
  commentsCount?: number;
  likesCount?: number;
  topComment?: {
    _id: string;
    content: string;
    commentCreator?: {
      _id: string;
      name: string;
      username?: string;
      photo?: string;
    };
    createdAt?: string;
  };
  [key: string]: any;
}

export interface NotificationItem {
  _id: string;
  id?: string;
  recipient?: NotificationRecipient;
  actor?: NotificationActor;
  user?: NotificationActor;
  type: string; // 'comment_post' | 'like_post' | 'follow_user' | 'reply_comment' | 'like_comment' | etc.
  entityType?: 'post' | 'user' | 'comment' | string;
  entityId?: string;
  entity?: NotificationEntity;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
  post?: Partial<Post>;
  comment?: {
    _id: string;
    content?: string;
    body?: string;
  };
  message?: string;
}

export interface NotificationsResponseData {
  notifications: NotificationItem[];
  unreadCount?: number;
}
