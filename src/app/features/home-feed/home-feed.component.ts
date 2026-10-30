import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostsService } from '../../core/services/posts-service';
import { UsersService } from '../../core/services/users-service';
import { ToastService } from '../../core/services/toast-service';
import { Post, SuggestionAuthor, PostComment } from '../../core/models/post.models';
import { User } from '../../core/models/api.models';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ConfirmModalComponent } from '../../shared/ui/confirm-modal/confirm-modal.component';
import { EditPostModalComponent } from '../../shared/ui/edit-post-modal/edit-post-modal.component';
import { SidebarComponent } from '../../shared/ui/sidebar/sidebar.component';

@Component({
  selector: 'app-home-feed',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    RouterLink,
    ConfirmModalComponent,
    EditPostModalComponent,
    SidebarComponent,
  ],
  templateUrl: './home-feed.component.html',
})
export class HomeFeedComponent implements OnInit, AfterViewInit {
  private readonly postsService = inject(PostsService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef<HTMLDivElement>;
  private scrollObserver?: IntersectionObserver;

  // Active Feed Mode: 'all' = Community | 'following' = Followed Authors
  readonly activeTab = signal<'all' | 'following'>('all');

  // Posts Feed State
  readonly posts = signal<Post[]>([]);
  readonly isLoadingInitial = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly currentPage = signal<number>(1);
  readonly hasMorePages = signal<boolean>(true);

  // Author Suggestions
  readonly suggestions = signal<SuggestionAuthor[]>([]);
  readonly isLoadingSuggestions = signal<boolean>(true);

  // Current Logged-in User
  readonly currentUser = this.usersService.currentUser;

  // Composer State
  readonly newPostBody = signal<string>('');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isPublishing = signal<boolean>(false);

  // Mobile Bottom Sheet Composer State
  readonly isMobileComposerOpen = signal<boolean>(false);

  // Inline Comments State (mapped by postId)
  readonly expandedComments = signal<Record<string, boolean>>({});
  readonly postComments = signal<Record<string, PostComment[]>>({});
  readonly loadingComments = signal<Record<string, boolean>>({});
  readonly newCommentText = signal<Record<string, string>>({});
  readonly isSubmittingComment = signal<Record<string, boolean>>({});

  // Post Action Menu & Edit/Delete Modals State
  readonly activeMenuPostId = signal<string | null>(null);
  readonly editingPost = signal<Post | null>(null);
  readonly isEditModalOpen = signal<boolean>(false);
  readonly deletingPost = signal<Post | null>(null);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);

  ngOnInit(): void {
    this.initCurrentUser();
    this.loadPosts(1, false);
    this.loadSuggestions();
    this.listenToComposeQueryParam();
  }

  ngAfterViewInit(): void {
    this.initInfiniteScrollObserver();
  }

  // Open mobile bottom sheet composer
  openMobileComposer(): void {
    this.isMobileComposerOpen.set(true);
  }

  // Close mobile bottom sheet composer and clear query param
  closeMobileComposer(): void {
    this.isMobileComposerOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { compose: null },
      queryParamsHandling: 'merge',
    });
  }

  // Listen to ?compose=true from Mobile Bottom Nav CTA
  private listenToComposeQueryParam(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('compose') === 'true') {
        this.openMobileComposer();
      }
    });
  }

  private initCurrentUser(): void {
    this.usersService.getMyProfile().subscribe({
      next: () => {},
      error: () => {},
    });
  }

  // Switch between "All Dispatches" and "Following"
  switchTab(tab: 'all' | 'following'): void {
    if (this.activeTab() === tab) return;

    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.hasMorePages.set(true);
    this.posts.set([]);
    this.isLoadingInitial.set(true);

    this.loadPosts(1, false);
  }

  // Load feed posts
  loadPosts(page: number = 1, append: boolean = false): void {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoadingInitial.set(true);
    }

    const myUserId = this.currentUser()?._id;
    const request$ =
      this.activeTab() === 'all'
        ? this.postsService.getAllPosts(page, 10)
        : this.postsService.getHomeFeed(page, 10);

    request$.subscribe({
      next: (res) => {
        const rawPosts = res.data?.posts || [];

        // Decorate posts with isLikedByMe
        const decoratedPosts: Post[] = rawPosts.map((p) => ({
          ...p,
          isLikedByMe: myUserId && Array.isArray(p.likes) ? p.likes.includes(myUserId) : false,
        }));

        if (append) {
          this.posts.update((prev) => [...prev, ...decoratedPosts]);
        } else {
          this.posts.set(decoratedPosts);
        }

        // Determine if more pages exist from pagination metadata
        const pagination = res.meta?.pagination;
        if (pagination) {
          this.hasMorePages.set(Boolean(pagination.nextPage));
        } else {
          // If no meta, stop when fewer than 10 returned
          this.hasMorePages.set(rawPosts.length === 10);
        }

        this.currentPage.set(page);
        this.isLoadingInitial.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoadingInitial.set(false);
        this.isLoadingMore.set(false);
      },
    });
  }

  // Load next page for infinite scroll
  loadNextPage(): void {
    if (this.isLoadingInitial() || this.isLoadingMore() || !this.hasMorePages()) {
      return;
    }
    const nextPage = this.currentPage() + 1;
    this.loadPosts(nextPage, true);
  }

  // Initialize IntersectionObserver on sentinel element
  private initInfiniteScrollObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry?.isIntersecting &&
          !this.isLoadingInitial() &&
          !this.isLoadingMore() &&
          this.hasMorePages()
        ) {
          this.loadNextPage();
        }
      },
      { rootMargin: '300px' },
    );

    if (this.scrollSentinel?.nativeElement) {
      this.scrollObserver.observe(this.scrollSentinel.nativeElement);
    }

    this.destroyRef.onDestroy(() => {
      this.scrollObserver?.disconnect();
    });
  }

  // Load right-rail author suggestions
  loadSuggestions(): void {
    this.isLoadingSuggestions.set(true);
    this.usersService.getSuggestions(5).subscribe({
      next: (res) => {
        this.suggestions.set(res.data?.suggestions || []);
        this.isLoadingSuggestions.set(false);
      },
      error: () => {
        this.isLoadingSuggestions.set(false);
      },
    });
  }

  // Optimistic Like / Unlike
  onToggleLike(post: Post): void {
    const wasLiked = Boolean(post.isLikedByMe);
    const prevCount = post.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    // 1. Instant optimistic update
    this.posts.update((items) =>
      items.map((p) =>
        p._id === post._id ? { ...p, isLikedByMe: !wasLiked, likesCount: newCount } : p,
      ),
    );

    // 2. Background API call
    this.postsService.toggleLike(post._id).subscribe({
      next: () => {
        // Success: already reflected
      },
      error: () => {
        // Rollback on failure
        this.posts.update((items) =>
          items.map((p) =>
            p._id === post._id ? { ...p, isLikedByMe: wasLiked, likesCount: prevCount } : p,
          ),
        );
        this.toastService.error('Action Failed', 'Could not update like status.');
      },
    });
  }

  // Optimistic Bookmark
  onToggleBookmark(post: Post): void {
    const prevBookmarked = Boolean(post.bookmarked);

    // 1. Instant optimistic update
    this.posts.update((items) =>
      items.map((p) => (p._id === post._id ? { ...p, bookmarked: !prevBookmarked } : p)),
    );

    if (!prevBookmarked) {
      this.toastService.info('Saved to Archives', 'Dispatch added to your reading list.');
    } else {
      this.toastService.info('Removed from Archives', 'Dispatch removed from your saved list.');
    }

    // 2. Background API call
    this.postsService.toggleBookmark(post._id).subscribe({
      next: () => {
        // Success
      },
      error: () => {
        // Rollback on failure
        this.posts.update((items) =>
          items.map((p) => (p._id === post._id ? { ...p, bookmarked: prevBookmarked } : p)),
        );
        this.toastService.error('Action Failed', 'Could not update bookmark.');
      },
    });
  }

  // Toggle follow on an author suggestion
  onToggleFollow(author: SuggestionAuthor): void {
    const prevFollowing = Boolean(author.isFollowing);
    const nextFollowing = !prevFollowing;

    // 1. Optimistic toggle of suggestions list
    this.suggestions.update((list) =>
      list.map((a) => (a._id === author._id ? { ...a, isFollowing: nextFollowing } : a)),
    );

    // 2. Optimistic toggle of currentUser following list
    this.currentUser.update((me) => {
      if (!me) return me;
      const prevList = Array.isArray(me.following) ? [...me.following] : [];
      const updatedList = nextFollowing
        ? [...prevList, author._id]
        : prevList.filter((id) => (typeof id === 'string' ? id : id._id) !== author._id);
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

    this.toastService.success(
      nextFollowing ? 'Following Author' : 'Unfollowed',
      nextFollowing
        ? `You will now receive dispatches from ${author.name}.`
        : `Removed ${author.name} from your following feed.`,
    );

    this.usersService.toggleFollow(author._id).subscribe({
      next: () => {
        // If on following feed, reload to reflect changes
        if (this.activeTab() === 'following') {
          this.loadPosts(1, false);
        }
      },
      error: () => {
        // Rollback
        this.suggestions.update((list) =>
          list.map((a) => (a._id === author._id ? { ...a, isFollowing: prevFollowing } : a)),
        );

        this.currentUser.update((me) => {
          if (!me) return me;
          const prevList = Array.isArray(me.following) ? [...me.following] : [];
          const updatedList = prevFollowing
            ? [...prevList, author._id]
            : prevList.filter((id) => (typeof id === 'string' ? id : id._id) !== author._id);
          const updated = {
            ...me,
            following: updatedList,
            followingCount: prevFollowing
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

  // Composer image selection
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Remove attached draft image
  onRemoveAttachment(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  // Publish new post
  onPublishPost(): void {
    const body = this.newPostBody().trim();
    const file = this.selectedFile();

    if (!body && !file) {
      this.toastService.warning('Empty Entry', 'Please write a reflection or attach an image.');
      return;
    }

    this.isPublishing.set(true);

    const formData = new FormData();
    if (body) {
      formData.append('body', body);
    }
    if (file) {
      formData.append('image', file);
    }

    this.postsService.createPost(formData).subscribe({
      next: (res) => {
        const createdPost = res.data?.post;
        if (createdPost) {
          // Prepend newly published post to the feed
          this.posts.update((prev) => [createdPost, ...prev]);
        }

        // Reset composer
        this.newPostBody.set('');
        this.selectedFile.set(null);
        this.previewUrl.set(null);
        this.isPublishing.set(false);

        // Close mobile sheet if open
        this.closeMobileComposer();

        this.toastService.success(
          'Post published to your feed',
          'Visible to your subscribers in The Reading Room',
        );
      },
      error: () => {
        this.isPublishing.set(false);
      },
    });
  }

  // Toggle inline comment section for a post
  toggleComments(postId: string): void {
    const isCurrentlyExpanded = Boolean(this.expandedComments()[postId]);
    const nextState = !isCurrentlyExpanded;

    this.expandedComments.update((prev) => ({
      ...prev,
      [postId]: nextState,
    }));

    // If expanding and comments have not been loaded yet, fetch them
    if (nextState && !this.postComments()[postId]) {
      this.loadComments(postId);
    }
  }

  // Fetch comments for a specific post
  loadComments(postId: string): void {
    this.loadingComments.update((prev) => ({ ...prev, [postId]: true }));
    const myUserId = this.currentUser()?._id;

    this.postsService.getPostComments(postId).subscribe({
      next: (res) => {
        const rawComments = res.data?.comments || (res as any).comments || [];
        const decorated: PostComment[] = rawComments.map((c: PostComment) => ({
          ...c,
          isLikedByMe: myUserId && Array.isArray(c.likes) ? c.likes.includes(myUserId) : false,
        }));

        this.postComments.update((prev) => ({
          ...prev,
          [postId]: decorated,
        }));
        this.loadingComments.update((prev) => ({ ...prev, [postId]: false }));
      },
      error: () => {
        this.loadingComments.update((prev) => ({ ...prev, [postId]: false }));
      },
    });
  }

  // Update text in comment composer for a specific post
  onCommentInput(postId: string, text: string): void {
    this.newCommentText.update((prev) => ({
      ...prev,
      [postId]: text,
    }));
  }

  // Handle Ctrl+Enter / Cmd+Enter keyboard shortcut in comment box
  onCommentKeydown(event: KeyboardEvent, postId: string): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.onAddComment(postId);
    }
  }

  // Add a new comment to a post
  onAddComment(postId: string): void {
    const text = (this.newCommentText()[postId] || '').trim();
    if (!text || this.isSubmittingComment()[postId]) return;

    this.isSubmittingComment.update((prev) => ({ ...prev, [postId]: true }));

    this.postsService.createComment(postId, { content: text }).subscribe({
      next: (res) => {
        const created = res.data?.comment || (res as any).comment;
        const userMe = this.currentUser();

        if (created) {
          const populated: PostComment = {
            ...created,
            commentCreator: created.commentCreator || {
              _id: userMe?._id || '',
              name: userMe?.name || 'You',
              username: userMe?.username || 'member',
              photo: userMe?.photo,
            },
            likesCount: 0,
            likes: [],
            isLikedByMe: false,
          };

          this.postComments.update((prev) => ({
            ...prev,
            [postId]: [populated, ...(prev[postId] || [])],
          }));

          // Update post comments count in feed
          this.posts.update((list) =>
            list.map((p) =>
              p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p,
            ),
          );

          // Clear text
          this.newCommentText.update((prev) => ({ ...prev, [postId]: '' }));
          this.toastService.success('Annotation Added', 'Your comment has been posted.');
        }

        this.isSubmittingComment.update((prev) => ({ ...prev, [postId]: false }));
      },
      error: () => {
        this.isSubmittingComment.update((prev) => ({ ...prev, [postId]: false }));
        this.toastService.error('Failed to Comment', 'Could not post your comment.');
      },
    });
  }

  // Delete a comment
  onDeleteComment(postId: string, comment: PostComment): void {
    const myId = this.currentUser()?._id;
    if (!myId || comment.commentCreator?._id !== myId) return;

    const previousComments = this.postComments()[postId] || [];

    // Optimistic removal
    this.postComments.update((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c._id !== comment._id),
    }));

    // Optimistic decrement of post comments count
    this.posts.update((list) =>
      list.map((p) =>
        p._id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p,
      ),
    );

    this.postsService.deleteComment(comment._id).subscribe({
      next: () => {
        this.toastService.info('Comment Deleted', 'Your comment was removed.');
      },
      error: () => {
        // Rollback on failure
        this.postComments.update((prev) => ({ ...prev, [postId]: previousComments }));
        this.posts.update((list) =>
          list.map((p) =>
            p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p,
          ),
        );
        this.toastService.error('Action Failed', 'Could not delete comment.');
      },
    });
  }

  // Like or unlike a comment
  onToggleLikeComment(postId: string, comment: PostComment): void {
    const wasLiked = Boolean(comment.isLikedByMe);
    const prevCount = comment.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    // Optimistic update
    this.postComments.update((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).map((c) =>
        c._id === comment._id ? { ...c, isLikedByMe: !wasLiked, likesCount: newCount } : c,
      ),
    }));

    this.postsService.toggleLikeComment(comment._id).subscribe({
      next: () => {},
      error: () => {
        // Rollback
        this.postComments.update((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((c) =>
            c._id === comment._id ? { ...c, isLikedByMe: wasLiked, likesCount: prevCount } : c,
          ),
        }));
      },
    });
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
          'Your dispatch was permanently removed from the Commons.',
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
}
