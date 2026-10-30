import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UsersService } from '../../core/services/users-service';
import { PostsService } from '../../core/services/posts-service';
import { ToastService } from '../../core/services/toast-service';
import { User } from '../../core/models/api.models';
import { Post } from '../../core/models/post.models';
import { ConfirmModalComponent } from '../../shared/ui/confirm-modal/confirm-modal.component';
import { EditPostModalComponent } from '../../shared/ui/edit-post-modal/edit-post-modal.component';
import { UpdatePhotoModalComponent } from '../../shared/ui/update-photo-modal/update-photo-modal.component';
import { SidebarComponent } from '../../shared/ui/sidebar/sidebar.component';

@Component({
  selector: 'app-author-profile',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    ConfirmModalComponent,
    EditPostModalComponent,
    UpdatePhotoModalComponent,
    SidebarComponent,
  ],
  templateUrl: './author-profile.component.html',
})
export class AuthorProfileComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly postsService = inject(PostsService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  // Author Profile Data
  readonly author = signal<User | null>(null);
  readonly currentUser = this.usersService.currentUser;

  // Posts Feed Data
  readonly posts = signal<Post[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isPostsLoading = signal<boolean>(true);

  // Profile Relationships
  readonly isCurrentUser = signal<boolean>(false);
  readonly isFollowing = signal<boolean>(false);
  readonly isFollowLoading = signal<boolean>(false);

  // Tab Filtering
  readonly activeTab = signal<'dispatches' | 'plates'>('dispatches');

  // Post Action Menu & Modals State
  readonly activeMenuPostId = signal<string | null>(null);
  readonly editingPost = signal<Post | null>(null);
  readonly isEditModalOpen = signal<boolean>(false);
  readonly deletingPost = signal<Post | null>(null);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);

  // Profile Photo Upload State
  readonly selectedPhotoFile = signal<File | null>(null);
  readonly photoPreviewUrl = signal<string | null>(null);
  readonly isPhotoModalOpen = signal<boolean>(false);

  // Computed state
  readonly displayedPosts = computed(() => {
    const tab = this.activeTab();
    if (tab === 'plates') {
      return this.posts().filter((p) => Boolean(p.image));
    }
    return this.posts();
  });

  readonly totalPosts = computed(() => this.posts().length);
  readonly totalPlates = computed(() => this.posts().filter((p) => Boolean(p.image)).length);

  ngOnInit(): void {
    this.initCurrentUser();
    this.listenToRouteChanges();
  }

  private initCurrentUser(): void {
    this.usersService.getMyProfile().subscribe({
      next: (res) => {
        const u = res.data?.user || (res as any).user;
        if (u) {
          // Re-evaluate following state once fresh user profile with following list arrives
          const currentAuthor = this.author();
          if (currentAuthor && !this.isCurrentUser()) {
            this.isFollowing.set(this.checkIsFollowing(currentAuthor, u._id));
          }
        }
      },
      error: () => {},
    });
  }

  private checkIsFollowing(targetAuthor: User, currentUserId?: string | null): boolean {
    const myId = currentUserId || this.currentUser()?._id;
    if (!myId || !targetAuthor) return false;

    // 1. Check if target author's followers array includes myId
    if (Array.isArray(targetAuthor.followers)) {
      const foundInFollowers = targetAuthor.followers.some((f: any) => {
        const fId = typeof f === 'string' ? f : f?._id || f?.id;
        return fId === myId;
      });
      if (foundInFollowers) return true;
    }

    // 2. Check if current user's following list includes target author's _id
    const myFollowing = this.currentUser()?.following;
    if (Array.isArray(myFollowing)) {
      const foundInFollowing = myFollowing.some((f: any) => {
        const fId = typeof f === 'string' ? f : f?._id || f?.id;
        return fId === targetAuthor._id;
      });
      if (foundInFollowing) return true;
    }

    // 3. Fallback to boolean flag if returned by API
    return Boolean(targetAuthor.isFollowing);
  }

  private listenToRouteChanges(): void {
    this.route.paramMap.subscribe((params) => {
      const idFromParam = params.get('id');
      const idFromQuery = this.route.snapshot.queryParamMap.get('id');
      const targetId = idFromParam || idFromQuery;
      this.loadProfile(targetId);
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      if (!this.route.snapshot.paramMap.get('id')) {
        const idFromQuery = queryParams.get('id');
        this.loadProfile(idFromQuery);
      }
    });
  }

  loadProfile(targetUserId?: string | null): void {
    let myId = this.currentUser()?._id;
    if (!myId) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          myId = parsed?._id;
        } catch {}
      }
    }

    if (targetUserId && targetUserId !== myId) {
      // Viewing a specific author's public profile
      this.isCurrentUser.set(false);
      this.isLoading.set(true);
      this.isPostsLoading.set(true);

      this.usersService.getUserProfile(targetUserId).subscribe({
        next: (res) => {
          const user = res.data?.user || (res as any).user;
          if (user) {
            this.author.set(user);
            this.isFollowing.set(this.checkIsFollowing(user, myId));
            if (myId && user._id === myId) {
              this.isCurrentUser.set(true);
            }
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.error(
            'Author Profile Not Found',
            'Could not retrieve the requested author profile.',
          );
        },
      });

      this.usersService.getUserPosts(targetUserId).subscribe({
        next: (res) => {
          const rawPosts =
            res.data?.posts ||
            (res as any).posts ||
            (Array.isArray(res.data) ? res.data : []) ||
            [];
          const authorUser = this.author();
          const decorated: Post[] = rawPosts.map((p: any) => ({
            ...p,
            user:
              typeof p.user === 'object' && p.user !== null
                ? p.user
                : {
                    _id: typeof p.user === 'string' ? p.user : targetUserId,
                    name: authorUser?.name || 'Author',
                    username: authorUser?.username || 'author',
                    photo: authorUser?.photo,
                  },
            isLikedByMe: myId && Array.isArray(p.likes) ? p.likes.includes(myId) : false,
          }));
          this.posts.set(decorated);
          this.isPostsLoading.set(false);
        },
        error: () => {
          this.posts.set([]);
          this.isPostsLoading.set(false);
        },
      });
    } else {
      // Viewing authenticated author's own profile
      this.isCurrentUser.set(true);
      this.isLoading.set(true);
      this.isPostsLoading.set(true);

      this.usersService.getMyProfile().subscribe({
        next: (res) => {
          const user = res.data?.user || (res as any).user;
          if (user) {
            this.author.set(user);
            this.currentUser.set(user);
            localStorage.setItem('user', JSON.stringify(user));

            if (user._id) {
              this.usersService.getUserPosts(user._id).subscribe({
                next: (postRes) => {
                  const rawPosts = postRes.data?.posts || (postRes as any).posts || [];
                  const decorated: Post[] = rawPosts.map((p: any) => ({
                    ...p,
                    isLikedByMe: Array.isArray(p.likes) ? p.likes.includes(user._id) : false,
                  }));
                  this.posts.set(decorated);
                  this.isPostsLoading.set(false);
                },
                error: () => {
                  this.posts.set([]);
                  this.isPostsLoading.set(false);
                },
              });
            } else {
              this.isPostsLoading.set(false);
            }
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.isPostsLoading.set(false);
          this.toastService.error(
            'Profile Retrieval Failed',
            'Could not load your author profile data.',
          );
        },
      });
    }
  }

  // Toggle follow/unfollow for author
  onToggleFollow(): void {
    const currentAuthor = this.author();
    if (this.isCurrentUser() || this.isFollowLoading() || !currentAuthor?._id) {
      return;
    }

    const myId = this.currentUser()?._id;
    this.isFollowLoading.set(true);
    const wasFollowing = this.isFollowing();
    const nextFollowing = !wasFollowing;

    // 1. Optimistic toggle of author followers
    this.isFollowing.set(nextFollowing);
    this.author.update((curr) => {
      if (!curr) return curr;
      const prevFollowersCount = curr.followersCount || 0;
      const prevFollowers = Array.isArray(curr.followers) ? [...curr.followers] : [];
      const updatedFollowers = nextFollowing
        ? [...prevFollowers, { _id: myId, name: this.currentUser()?.name }]
        : prevFollowers.filter((f: any) => (typeof f === 'string' ? f : f?._id || f?.id) !== myId);

      return {
        ...curr,
        followers: updatedFollowers,
        followersCount: nextFollowing
          ? prevFollowersCount + 1
          : Math.max(0, prevFollowersCount - 1),
      };
    });

    // 2. Optimistic toggle of currentUser following list
    this.currentUser.update((me) => {
      if (!me) return me;
      const prevFollowing = Array.isArray(me.following) ? [...me.following] : [];
      const nextFollowingList = nextFollowing
        ? [...prevFollowing, currentAuthor._id]
        : prevFollowing.filter(
            (f: any) => (typeof f === 'string' ? f : f?._id || f?.id) !== currentAuthor._id,
          );
      const updated = {
        ...me,
        following: nextFollowingList,
        followingCount: nextFollowing
          ? (me.followingCount || 0) + 1
          : Math.max(0, (me.followingCount || 0) - 1),
      };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });

    this.usersService.toggleFollow(currentAuthor._id).subscribe({
      next: () => {
        this.isFollowLoading.set(false);
        if (nextFollowing) {
          this.toastService.info(
            'Following Author',
            `You will now receive dispatches from ${currentAuthor.name}.`,
          );
        } else {
          this.toastService.info(
            'Unfollowed Author',
            `Removed ${currentAuthor.name} from your following feed.`,
          );
        }
      },
      error: () => {
        // Rollback on error
        this.isFollowLoading.set(false);
        this.isFollowing.set(wasFollowing);
        this.author.update((curr) => {
          if (!curr) return curr;
          const prevFollowersCount = curr.followersCount || 0;
          const prevFollowers = Array.isArray(curr.followers) ? [...curr.followers] : [];
          const rolledBackFollowers = wasFollowing
            ? [...prevFollowers, { _id: myId, name: this.currentUser()?.name }]
            : prevFollowers.filter(
                (f: any) => (typeof f === 'string' ? f : f?._id || f?.id) !== myId,
              );

          return {
            ...curr,
            followers: rolledBackFollowers,
            followersCount: wasFollowing
              ? prevFollowersCount + 1
              : Math.max(0, prevFollowersCount - 1),
          };
        });

        this.currentUser.update((me) => {
          if (!me) return me;
          const prevFollowing = Array.isArray(me.following) ? [...me.following] : [];
          const nextFollowingList = wasFollowing
            ? [...prevFollowing, currentAuthor._id]
            : prevFollowing.filter(
                (f: any) => (typeof f === 'string' ? f : f?._id || f?.id) !== currentAuthor._id,
              );
          const updated = {
            ...me,
            following: nextFollowingList,
            followingCount: wasFollowing
              ? (me.followingCount || 0) + 1
              : Math.max(0, (me.followingCount || 0) - 1),
          };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });

        this.toastService.error('Action Failed', 'Could not update follow status.');
      },
    });
  }

  // Optimistic Like / Unlike on author post
  onToggleLike(post: Post): void {
    const wasLiked = Boolean(post.isLikedByMe);
    const prevCount = post.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    this.posts.update((items) =>
      items.map((p) =>
        p._id === post._id ? { ...p, isLikedByMe: !wasLiked, likesCount: newCount } : p,
      ),
    );

    this.postsService.toggleLike(post._id).subscribe({
      next: () => {},
      error: () => {
        this.posts.update((items) =>
          items.map((p) =>
            p._id === post._id ? { ...p, isLikedByMe: wasLiked, likesCount: prevCount } : p,
          ),
        );
        this.toastService.error('Action Failed', 'Could not update like.');
      },
    });
  }

  // Optimistic Bookmark on author post
  onToggleBookmark(post: Post): void {
    const prevBookmarked = Boolean(post.bookmarked);

    this.posts.update((items) =>
      items.map((p) => (p._id === post._id ? { ...p, bookmarked: !prevBookmarked } : p)),
    );

    if (!prevBookmarked) {
      this.toastService.info('Saved to Archives', 'Dispatch added to your preserved archives.');
    } else {
      this.toastService.info('Removed from Archives', 'Dispatch removed from preserved archives.');
    }

    this.postsService.toggleBookmark(post._id).subscribe({
      next: () => {},
      error: () => {
        this.posts.update((items) =>
          items.map((p) => (p._id === post._id ? { ...p, bookmarked: prevBookmarked } : p)),
        );
        this.toastService.error('Action Failed', 'Could not update archive status.');
      },
    });
  }

  // Share profile URL
  onShareProfile(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.toastService.info('Profile Link Copied', 'Author profile link copied to clipboard.');
    }
  }

  // Set active tab
  setActiveTab(tab: 'dispatches' | 'plates'): void {
    this.activeTab.set(tab);
  }

  // Check if post belongs to current user
  isMyPost(post: Post): boolean {
    const myId = this.currentUser()?._id;
    const authorId = typeof post.user === 'string' ? post.user : post.user?._id;
    return Boolean(myId && authorId && myId === authorId);
  }

  // Toggle action menu for a specific post
  togglePostMenu(postId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenuPostId.update((curr) => (curr === postId ? null : postId));
  }

  // Close any open post menu
  closePostMenu(): void {
    this.activeMenuPostId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.activeMenuPostId()) {
      this.closePostMenu();
    }
  }

  // Edit Post flow
  openEditPost(post: Post): void {
    this.closePostMenu();
    this.editingPost.set(post);
    this.isEditModalOpen.set(true);
  }

  closeEditPost(): void {
    this.isEditModalOpen.set(false);
    this.editingPost.set(null);
  }

  onPostUpdated(updated: Post): void {
    this.posts.update((list) =>
      list.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)),
    );
  }

  // Delete Post flow
  promptDeletePost(post: Post): void {
    this.closePostMenu();
    this.deletingPost.set(post);
    this.isDeleteModalOpen.set(true);
  }

  closeDeletePost(): void {
    if (!this.isDeleting()) {
      this.isDeleteModalOpen.set(false);
      this.deletingPost.set(null);
    }
  }

  confirmDeletePost(): void {
    const postToDelete = this.deletingPost();
    if (!postToDelete || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.postsService.deletePost(postToDelete._id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteModalOpen.set(false);
        this.deletingPost.set(null);
        this.posts.update((list) => list.filter((p) => p._id !== postToDelete._id));
        this.toastService.info(
          'Dispatch Retracted',
          'Your dispatch was permanently removed from your profile.',
        );
      },
      error: () => {
        this.isDeleting.set(false);
        this.toastService.error('Action Failed', 'Could not delete dispatch.');
      },
    });
  }

  // Copy direct link to clipboard
  onCopyPostLink(postId: string): void {
    this.closePostMenu();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/post-detail?id=${postId}`;
      navigator.clipboard.writeText(url);
      this.toastService.info('Link Copied', 'Direct link to dispatch copied to clipboard.');
    }
  }

  // Trigger file dialog
  triggerPhotoInput(): void {
    this.photoInput?.nativeElement.click();
  }

  // Profile photo file selection
  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedPhotoFile.set(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreviewUrl.set(reader.result as string);
        this.isPhotoModalOpen.set(true);
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be reselected if needed
      input.value = '';
    }
  }

  closePhotoModal(): void {
    this.isPhotoModalOpen.set(false);
    this.selectedPhotoFile.set(null);
    this.photoPreviewUrl.set(null);
  }

  onPhotoUploaded(newPhotoUrl: string): void {
    this.closePhotoModal();
    if (newPhotoUrl) {
      this.author.update((a) => (a ? { ...a, photo: newPhotoUrl } : a));

      // Update author photo in posts feed
      const myId = this.currentUser()?._id;
      this.posts.update((list) =>
        list.map((p) => {
          const pUserId = typeof p.user === 'string' ? p.user : p.user?._id;
          if (pUserId === myId && typeof p.user === 'object') {
            return { ...p, user: { ...p.user, photo: newPhotoUrl } };
          }
          return p;
        }),
      );
    }
  }
}
