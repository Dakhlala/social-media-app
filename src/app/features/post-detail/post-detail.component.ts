import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PostsService } from '../../core/services/posts-service';
import { UsersService } from '../../core/services/users-service';
import { ToastService } from '../../core/services/toast-service';
import { Post, PostComment } from '../../core/models/post.models';
import { User } from '../../core/models/api.models';
import { ConfirmModalComponent } from '../../shared/ui/confirm-modal/confirm-modal.component';
import { EditPostModalComponent } from '../../shared/ui/edit-post-modal/edit-post-modal.component';
import { SidebarComponent } from '../../shared/ui/sidebar/sidebar.component';

@Component({
  selector: 'app-post-detail',
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
  templateUrl: './post-detail.component.html',
})
export class PostDetailComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Post & Author State
  readonly post = signal<Post | null>(null);
  readonly currentUser = this.usersService.currentUser;
  readonly isLoadingPost = signal<boolean>(true);

  // Comments State
  readonly comments = signal<PostComment[]>([]);
  readonly isLoadingComments = signal<boolean>(true);
  readonly isSubmittingComment = signal<boolean>(false);
  readonly newCommentContent = signal<string>('');
  readonly selectedSort = signal<'latest' | 'earliest'>('latest');

  // Edit & Delete Modals State
  readonly isEditModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);

  // Follow State for Post Author
  readonly isFollowingAuthor = signal<boolean>(false);
  readonly isFollowLoading = signal<boolean>(false);

  // Computed Properties
  readonly sortedComments = computed(() => {
    const list = [...this.comments()];
    const sort = this.selectedSort();
    if (sort === 'earliest') {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly totalComments = computed(() => this.comments().length);

  readonly isAuthorOfPost = computed(() => {
    const myId = this.currentUser()?._id;
    const postAuthorId = this.post()?.user?._id;
    return Boolean(myId && postAuthorId && myId === postAuthorId);
  });

  ngOnInit(): void {
    this.initCurrentUser();
    this.listenToRouteChanges();
  }

  private initCurrentUser(): void {
    this.usersService.getMyProfile().subscribe({
      next: (res) => {
        const u = res.data?.user || (res as any).user;
        if (u) {
          // Check follow status if post already loaded
          const authorId = this.post()?.user?._id;
          if (authorId && authorId !== u._id) {
            this.checkAuthorFollow(authorId, u);
          }
        }
      },
      error: () => {},
    });
  }

  private listenToRouteChanges(): void {
    this.route.paramMap.subscribe((params) => {
      const idFromParam = params.get('id');
      const idFromQuery = this.route.snapshot.queryParamMap.get('id');
      const targetId = idFromParam || idFromQuery;
      if (targetId) {
        this.loadPostAndComments(targetId);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      if (!this.route.snapshot.paramMap.get('id')) {
        const idFromQuery = queryParams.get('id');
        if (idFromQuery) {
          this.loadPostAndComments(idFromQuery);
        }
      }
    });
  }

  loadPostAndComments(postId: string): void {
    this.isLoadingPost.set(true);
    this.isLoadingComments.set(true);

    const myId = this.currentUser()?._id;

    // 1. Fetch Post Detail
    this.postsService.getSinglePost(postId).subscribe({
      next: (res) => {
        const rawPost = res.data?.post || (res as any).post;
        if (rawPost) {
          const decorated: Post = {
            ...rawPost,
            isLikedByMe:
              myId && Array.isArray(rawPost.likes) ? rawPost.likes.includes(myId) : false,
          };
          this.post.set(decorated);

          if (decorated.user?._id) {
            this.checkAuthorFollow(decorated.user._id);
          }
        }
        this.isLoadingPost.set(false);
      },
      error: () => {
        this.isLoadingPost.set(false);
        this.toastService.error(
          'Dispatch Folio Unavailable',
          'Could not retrieve the requested dispatch.',
        );
      },
    });

    // 2. Fetch Comments
    this.postsService.getPostComments(postId).subscribe({
      next: (res) => {
        const rawComments =
          res.data?.comments ||
          (res as any).comments ||
          (Array.isArray(res.data) ? res.data : []) ||
          [];

        const decorated: PostComment[] = rawComments.map((c: any) => ({
          ...c,
          isLikedByMe: myId && Array.isArray(c.likes) ? c.likes.includes(myId) : false,
        }));
        this.comments.set(decorated);
        this.isLoadingComments.set(false);
      },
      error: () => {
        this.comments.set([]);
        this.isLoadingComments.set(false);
      },
    });
  }

  private checkAuthorFollow(authorId: string, userObj?: User): void {
    const me = userObj || this.currentUser();
    if (!me || !authorId) return;

    if (Array.isArray(me.following)) {
      const isFollowing = me.following.some(
        (f: any) => (typeof f === 'string' ? f : f?._id || f?.id) === authorId,
      );
      this.isFollowingAuthor.set(isFollowing);
    }
  }

  // Toggle follow on the dispatch author
  onToggleFollowAuthor(): void {
    const authorId = this.post()?.user?._id;
    if (!authorId || this.isAuthorOfPost() || this.isFollowLoading()) {
      return;
    }

    this.isFollowLoading.set(true);
    const wasFollowing = this.isFollowingAuthor();
    const nextFollowing = !wasFollowing;

    this.isFollowingAuthor.set(nextFollowing);

    this.currentUser.update((me) => {
      if (!me) return me;
      const prevList = Array.isArray(me.following) ? [...me.following] : [];
      const updatedList = nextFollowing
        ? [...prevList, authorId]
        : prevList.filter((id) => (typeof id === 'string' ? id : id?._id || id?.id) !== authorId);
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

    this.usersService.toggleFollow(authorId).subscribe({
      next: () => {
        this.isFollowLoading.set(false);
        const name = this.post()?.user?.name || 'Author';
        if (nextFollowing) {
          this.toastService.info(
            'Following Author',
            `You will now receive dispatches from ${name}.`,
          );
        } else {
          this.toastService.info('Unfollowed Author', `Removed ${name} from your following feed.`);
        }
      },
      error: () => {
        this.isFollowLoading.set(false);
        this.isFollowingAuthor.set(wasFollowing);
        this.toastService.error('Action Failed', 'Could not update follow status.');
      },
    });
  }

  // Like / Unlike Post
  onToggleLikePost(): void {
    const p = this.post();
    if (!p) return;

    const wasLiked = Boolean(p.isLikedByMe);
    const prevCount = p.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    this.post.set({
      ...p,
      isLikedByMe: !wasLiked,
      likesCount: newCount,
    });

    this.postsService.toggleLike(p._id).subscribe({
      next: () => {},
      error: () => {
        this.post.set({
          ...p,
          isLikedByMe: wasLiked,
          likesCount: prevCount,
        });
        this.toastService.error('Action Failed', 'Could not update appreciation.');
      },
    });
  }

  // Bookmark / Archive Post
  onToggleBookmarkPost(): void {
    const p = this.post();
    if (!p) return;

    const prevBookmarked = Boolean(p.bookmarked);
    this.post.set({
      ...p,
      bookmarked: !prevBookmarked,
    });

    if (!prevBookmarked) {
      this.toastService.info('Saved to Archives', 'Dispatch added to your preserved archives.');
    } else {
      this.toastService.info('Removed from Archives', 'Dispatch removed from preserved archives.');
    }

    this.postsService.toggleBookmark(p._id).subscribe({
      next: () => {},
      error: () => {
        this.post.set({
          ...p,
          bookmarked: prevBookmarked,
        });
        this.toastService.error('Action Failed', 'Could not update archive status.');
      },
    });
  }

  // Submit a new Comment / Annotation
  onSubmitComment(): void {
    const content = this.newCommentContent().trim();
    const currentPost = this.post();
    if (!content || !currentPost?._id || this.isSubmittingComment()) {
      return;
    }

    this.isSubmittingComment.set(true);

    this.postsService.createComment(currentPost._id, { content }).subscribe({
      next: (res) => {
        const createdComment = res.data?.comment || (res as any).comment;
        if (createdComment) {
          const userMe = this.currentUser();
          const populated: PostComment = {
            ...createdComment,
            commentCreator: createdComment.commentCreator || {
              _id: userMe?._id || '',
              name: userMe?.name || 'You',
              username: userMe?.username || 'scholar',
              photo: userMe?.photo,
            },
            likesCount: 0,
            likes: [],
            isLikedByMe: false,
          };

          this.comments.update((list) => [populated, ...list]);
          this.post.update((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
          this.newCommentContent.set('');
          this.toastService.success(
            'Annotation Recorded',
            'Your commentary has been inscribed in the ledger.',
          );
        }
        this.isSubmittingComment.set(false);
      },
      error: () => {
        this.isSubmittingComment.set(false);
        this.toastService.error('Failed to Post', 'Could not record your annotation.');
      },
    });
  }

  // Delete a Comment
  onDeleteComment(comment: PostComment): void {
    const myId = this.currentUser()?._id;
    if (!myId || comment.commentCreator?._id !== myId) return;

    const previousList = this.comments();
    this.comments.update((list) => list.filter((c) => c._id !== comment._id));
    this.post.update((p) =>
      p ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p,
    );

    this.postsService.deleteComment(comment._id).subscribe({
      next: () => {
        this.toastService.info('Annotation Removed', 'Your comment was deleted from the ledger.');
      },
      error: () => {
        this.comments.set(previousList);
        this.post.update((p) => (p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
        this.toastService.error('Action Failed', 'Could not delete comment.');
      },
    });
  }

  // Like / Unlike Comment
  onToggleLikeComment(comment: PostComment): void {
    const wasLiked = Boolean(comment.isLikedByMe);
    const prevCount = comment.likesCount || 0;
    const newCount = wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1;

    this.comments.update((list) =>
      list.map((c) =>
        c._id === comment._id ? { ...c, isLikedByMe: !wasLiked, likesCount: newCount } : c,
      ),
    );

    this.postsService.toggleLikeComment(comment._id).subscribe({
      next: () => {},
      error: () => {
        this.comments.update((list) =>
          list.map((c) =>
            c._id === comment._id ? { ...c, isLikedByMe: wasLiked, likesCount: prevCount } : c,
          ),
        );
      },
    });
  }

  // Edit Post flow
  openEditModal(): void {
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onPostUpdated(updated: Post): void {
    this.post.update((curr) => (curr ? { ...curr, ...updated } : curr));
  }

  // Delete Post flow
  promptDeletePost(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    if (!this.isDeleting()) {
      this.isDeleteModalOpen.set(false);
    }
  }

  confirmDeletePost(): void {
    const p = this.post();
    if (!p || !this.isAuthorOfPost() || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.postsService.deletePost(p._id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteModalOpen.set(false);
        this.toastService.info('Dispatch Retracted', 'Your publication was permanently removed.');
        this.router.navigate(['/home']);
      },
      error: () => {
        this.isDeleting.set(false);
        this.toastService.error('Action Failed', 'Could not delete dispatch.');
      },
    });
  }

  // Share dispatch URL
  onSharePost(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.toastService.info(
        'Folio Link Copied',
        'Direct link to this dispatch copied to clipboard.',
      );
    }
  }

  // Sort comments
  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedSort.set(value === 'Earliest' ? 'earliest' : 'latest');
  }
}
