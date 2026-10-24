import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationsService } from '../../core/services/notifications-service';
import { UsersService } from '../../core/services/users-service';
import { PostsService } from '../../core/services/posts-service';
import { ToastService } from '../../core/services/toast-service';
import { NotificationItem } from '../../core/models/notification.models';
import { User } from '../../core/models/api.models';

export type NotificationTab = 'all' | 'comments' | 'likes' | 'follows';

export interface NotificationDisplayItem extends NotificationItem {
  actorId: string;
  actorName: string;
  actorHandle: string;
  actorAvatar: string;
  actionText: string;
  timeAgo: string;
  timeBucket: 'Today' | 'Yesterday' | 'Earlier this week';
  postTitle?: string;
  quoteSnippet?: string;
  targetPostId?: string;
  targetUserId?: string;
  iconName: string;
  isFollowingBack?: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly usersService = inject(UsersService);
  private readonly postsService = inject(PostsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  // Current Logged-in User
  readonly currentUser = signal<User | null>(null);

  // Active View State
  readonly activeTab = signal<NotificationTab>('all');
  readonly isLoading = signal<boolean>(true);
  readonly isMarkingAll = signal<boolean>(false);
  readonly notifications = signal<NotificationDisplayItem[]>([]);
  readonly unreadCount = signal<number>(0);

  // Filtered Notifications based on active tab
  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    const tab = this.activeTab();

    if (tab === 'all') return list;
    if (tab === 'comments') {
      return list.filter(
        (n) =>
          n.type.includes('comment') ||
          n.type.includes('reply') ||
          n.type.includes('annotation')
      );
    }
    if (tab === 'likes') {
      return list.filter((n) => n.type.includes('like'));
    }
    if (tab === 'follows') {
      return list.filter(
        (n) => n.type.includes('follow') || n.type.includes('subscript')
      );
    }
    return list;
  });

  // Grouped by time bucket
  readonly todayNotifications = computed(() =>
    this.filteredNotifications().filter((n) => n.timeBucket === 'Today')
  );
  readonly yesterdayNotifications = computed(() =>
    this.filteredNotifications().filter((n) => n.timeBucket === 'Yesterday')
  );
  readonly earlierNotifications = computed(() =>
    this.filteredNotifications().filter((n) => n.timeBucket === 'Earlier this week')
  );

  // Tab Badge Counts
  readonly countAll = computed(() => this.notifications().length);
  readonly countComments = computed(
    () =>
      this.notifications().filter(
        (n) =>
          n.type.includes('comment') ||
          n.type.includes('reply') ||
          n.type.includes('annotation')
      ).length
  );
  readonly countLikes = computed(
    () => this.notifications().filter((n) => n.type.includes('like')).length
  );
  readonly countFollows = computed(
    () =>
      this.notifications().filter(
        (n) => n.type.includes('follow') || n.type.includes('subscript')
      ).length
  );

  ngOnInit(): void {
    this.initCurrentUser();
    this.loadNotifications();
    this.loadUnreadCount();
  }

  private initCurrentUser(): void {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        this.currentUser.set(JSON.parse(stored));
      }
    } catch {}

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

  // Load real notifications from backend API
  loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationsService.getNotifications(false, 1, 40).subscribe({
      next: (res) => {
        let rawItems: any[] = [];
        if (Array.isArray(res.data)) {
          rawItems = res.data;
        } else if (res.data && Array.isArray((res.data as any).notifications)) {
          rawItems = (res.data as any).notifications;
        }

        if (rawItems && rawItems.length > 0) {
          this.notifications.set(this.transformRawNotifications(rawItems));
        } else {
          this.notifications.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.isLoading.set(false);
      },
    });
  }

  // Fetch unread count from API
  loadUnreadCount(): void {
    this.notificationsService.getUnreadCount().subscribe({
      next: (res) => {
        const count = res.data?.unreadCount ?? (res as any).unreadCount;
        if (typeof count === 'number') {
          this.unreadCount.set(count);
        } else {
          this.unreadCount.set(
            this.notifications().filter((n) => !n.read && !n.isRead).length
          );
        }
      },
      error: () => {
        this.unreadCount.set(
          this.notifications().filter((n) => !n.read && !n.isRead).length
        );
      },
    });
  }

  // Switch filter tab
  switchTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    if (this.isMarkingAll() || this.unreadCount() === 0) return;
    this.isMarkingAll.set(true);

    // Optimistically update all in state
    this.notifications.update((items) =>
      items.map((item) => ({ ...item, read: true, isRead: true }))
    );
    this.unreadCount.set(0);

    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.isMarkingAll.set(false);
        this.toastService.success('Ledger Updated', 'All notifications marked as read.');
      },
      error: () => {
        this.isMarkingAll.set(false);
      },
    });
  }

  // Mark a single notification as read
  markSingleAsRead(item: NotificationDisplayItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (item.read || item.isRead) return;

    this.notifications.update((items) =>
      items.map((n) => (n._id === item._id ? { ...n, read: true, isRead: true } : n))
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));

    if (item._id) {
      this.notificationsService.markAsRead(item._id).subscribe({
        next: () => {},
        error: () => {},
      });
    }
  }

  // Clicking an entire notification card navigates to relevant target
  onNotificationClick(item: NotificationDisplayItem): void {
    this.markSingleAsRead(item);

    if (item.targetPostId) {
      this.router.navigate(['/post-detail', item.targetPostId]);
    } else if (item.targetUserId) {
      this.router.navigate(['/author', item.targetUserId]);
    }
  }

  // Toggle follow-back on author who followed
  onFollowBack(item: NotificationDisplayItem, event: Event): void {
    event.stopPropagation();
    const actorId = item.actorId;
    if (!actorId) return;

    const nextFollowing = !item.isFollowingBack;

    this.notifications.update((items) =>
      items.map((n) =>
        n._id === item._id ? { ...n, isFollowingBack: nextFollowing } : n
      )
    );

    // Update currentUser following state
    this.currentUser.update((me) => {
      if (!me) return me;
      const prevList = Array.isArray(me.following) ? [...me.following] : [];
      const updatedList = nextFollowing
        ? [...prevList, actorId]
        : prevList.filter(
            (id) => (typeof id === 'string' ? id : id?._id || id?.id) !== actorId
          );
      const updated = {
        ...me,
        following: updatedList,
        followingCount: nextFollowing
          ? (me.followingCount || 0) + 1
          : Math.max(0, (me.followingCount || 0) - 1),
      };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });

    this.usersService.toggleFollow(actorId).subscribe({
      next: () => {
        this.toastService.success(
          nextFollowing ? 'Subscribed to Author' : 'Unsubscribed',
          nextFollowing
            ? `You will now receive dispatches from ${item.actorName}.`
            : `Removed ${item.actorName} from your following feed.`
        );
      },
      error: () => {
        // Rollback on failure
        this.notifications.update((items) =>
          items.map((n) =>
            n._id === item._id ? { ...n, isFollowingBack: !nextFollowing } : n
          )
        );
        this.toastService.error('Action Failed', 'Could not update subscription.');
      },
    });
  }

  // Save / Bookmark post from notification
  onArchivePost(item: NotificationDisplayItem, event: Event): void {
    event.stopPropagation();
    const postId = item.targetPostId;
    if (!postId) return;

    this.postsService.toggleBookmark(postId).subscribe({
      next: () => {
        this.toastService.info('Saved to Archives', 'Dispatch preserved in your repository.');
      },
      error: () => {
        this.toastService.error('Action Failed', 'Could not update archives.');
      },
    });
  }

  // Transform backend API notification objects into rich display items
  private transformRawNotifications(rawItems: any[]): NotificationDisplayItem[] {
    const myId = this.currentUser()?._id;
    const myFollowing = this.currentUser()?.following || [];

    return rawItems.map((raw, idx) => {
      const actor = raw.actor || raw.user || {};
      const entity = raw.entity || {};
      const createdAt = new Date(raw.createdAt || Date.now());
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      let timeBucket: 'Today' | 'Yesterday' | 'Earlier this week' = 'Today';
      let timeAgo = `${Math.max(1, diffHours)}h ago`;

      if (diffHours < 1) {
        const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        timeAgo = `${mins}m ago`;
        timeBucket = 'Today';
      } else if (diffHours < 24) {
        timeBucket = 'Today';
      } else if (diffHours < 48) {
        timeBucket = 'Yesterday';
        timeAgo = 'Yesterday';
      } else {
        timeBucket = 'Earlier this week';
        timeAgo = `${Math.floor(diffHours / 24)} days ago`;
      }

      let iconName = 'notifications';
      let actionText = 'interacted with your publication';
      let postTitle: string | undefined = undefined;
      let quoteSnippet: string | undefined = undefined;
      let targetPostId: string | undefined = undefined;
      let targetUserId: string | undefined = actor._id || raw.entityId;

      const notifType = String(raw.type || '').toLowerCase();

      // Entity could be a post
      if (raw.entityType === 'post' || entity.body) {
        targetPostId = raw.entityId || entity._id || raw.post?._id;
        postTitle = entity.body
          ? entity.body.length > 70
            ? entity.body.slice(0, 70) + '…'
            : entity.body
          : undefined;
      }

      // Check whether user is following actor
      const isFollowingBack =
        Array.isArray(myFollowing) &&
        actor._id &&
        myFollowing.some(
          (f: any) => (typeof f === 'string' ? f : f?._id || f?.id) === actor._id
        );

      switch (notifType) {
        case 'comment_post':
        case 'comment':
        case 'reply_comment':
        case 'reply':
          iconName = 'edit_document';
          actionText = 'annotated your dispatch';
          quoteSnippet =
            entity.topComment?.content ||
            raw.comment?.content ||
            raw.comment?.body;
          break;
        case 'like_post':
        case 'like':
        case 'like_comment':
          iconName = 'favorite';
          actionText = 'appreciated your dispatch';
          quoteSnippet = entity.body;
          break;
        case 'follow_user':
        case 'follow':
        case 'subscription':
          iconName = 'person_add';
          actionText = 'subscribed to your folio and publications';
          targetUserId = actor._id || raw.entityId;
          break;
        case 'citation':
        case 'mention':
          iconName = 'format_quote';
          actionText = 'cited your publication in their research';
          quoteSnippet = entity.body;
          break;
        default:
          iconName = 'auto_stories';
          actionText = raw.message || 'interacted with your publication';
          quoteSnippet = entity.body;
      }

      const actorName = actor.name || 'Scholar';
      const actorHandle =
        entity.username ||
        entity.topComment?.commentCreator?.username ||
        actor.username ||
        actorName.toLowerCase().replace(/\s+/g, '');

      return {
        ...raw,
        _id: raw._id || `notif-${idx}`,
        actorId: actor._id || raw.entityId || '',
        actorName,
        actorHandle,
        actorAvatar:
          actor.photo ||
          'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png',
        actionText,
        timeAgo,
        timeBucket,
        postTitle,
        quoteSnippet,
        targetPostId,
        targetUserId,
        iconName,
        isFollowingBack: Boolean(isFollowingBack),
        read: Boolean(raw.read || raw.isRead),
      };
    });
  }
}
