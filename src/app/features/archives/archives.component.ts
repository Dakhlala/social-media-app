import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users-service';
import { PostsService } from '../../core/services/posts-service';
import { ToastService } from '../../core/services/toast-service';
import { Post } from '../../core/models/post.models';
import { SidebarComponent } from '../../shared/ui/sidebar/sidebar.component';

export interface ArchivalItem {
  _id: string;
  title: string;
  body: string;
  quote?: string;
  image?: string;
  authorName: string;
  authorUsername: string;
  authorPhoto?: string;
  authorMeta?: string;
  archivalId: string;
  preservedDate: string;
  citationsCount: number;
  commentsCount: number;
  tags: string[];
  hasAttachment: boolean;
  doi: string;
}

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe, SidebarComponent],
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.css',
})
export class ArchivesComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly postsService = inject(PostsService);
  private readonly toastService = inject(ToastService);

  readonly currentUser = this.usersService.currentUser;
  readonly items = signal<ArchivalItem[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Active Filter / Category
  readonly activeFilter = signal<'all' | 'plates' | 'discussions'>('all');

  // Filtered items
  readonly filteredItems = computed(() => {
    let list = [...this.items()];
    const filter = this.activeFilter();

    if (filter === 'plates') {
      list = list.filter((it) => it.hasAttachment || Boolean(it.image));
    } else if (filter === 'discussions') {
      list = list.filter((it) => it.commentsCount > 0);
    }

    return list;
  });

  // Featured Item (First item in repository)
  readonly featuredItem = computed(() => this.filteredItems()[0] || null);
  readonly regularItems = computed(() => {
    const list = this.filteredItems();
    return list.slice(1);
  });

  // Dynamic counts for category tabs
  readonly countAll = computed(() => this.items().length);
  readonly countPlates = computed(
    () => this.items().filter((it) => it.hasAttachment || Boolean(it.image)).length,
  );
  readonly countDiscussions = computed(
    () => this.items().filter((it) => it.commentsCount > 0).length,
  );

  ngOnInit(): void {
    this.loadBookmarks();
  }

  loadBookmarks(): void {
    this.isLoading.set(true);
    this.usersService.getBookmarks().subscribe({
      next: (res) => {
        let rawPosts: any[] = [];
        if (Array.isArray(res.data)) {
          rawPosts = res.data;
        } else if (res.data && Array.isArray((res.data as any).posts)) {
          rawPosts = (res.data as any).posts;
        } else if (res.data && Array.isArray((res.data as any).bookmarks)) {
          rawPosts = (res.data as any).bookmarks;
        } else if (Array.isArray((res as any).bookmarks)) {
          rawPosts = (res as any).bookmarks;
        } else if (Array.isArray((res as any).posts)) {
          rawPosts = (res as any).posts;
        }

        if (rawPosts && rawPosts.length > 0) {
          this.items.set(this.transformPostsToArchivalItems(rawPosts));
        } else {
          this.items.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.isLoading.set(false);
      },
    });
  }

  onRemoveBookmark(item: ArchivalItem, event: Event): void {
    event.stopPropagation();
    const prevItems = this.items();

    // Optimistically remove
    this.items.update((list) => list.filter((i) => i._id !== item._id));
    this.toastService.info(
      'Removed from Archives',
      'Dispatch removed from your permanent repository.',
    );

    this.postsService.toggleBookmark(item._id).subscribe({
      next: () => {},
      error: () => {
        // Rollback on network failure
        this.items.set(prevItems);
        this.toastService.error('Action Failed', 'Could not update archive status.');
      },
    });
  }

  onCopyBibtex(item: ArchivalItem, event: Event): void {
    event.stopPropagation();
    const bibtex = `@article{${item.authorUsername}_${item.archivalId.replace(/[^a-zA-Z0-9]/g, '')},\n  author = {${item.authorName}},\n  title = {${item.title}},\n  journal = {Gather Literary Commons},\n  year = {2024},\n  doi = {${item.doi || '10.8412/gthr.arch'}}\n}`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(bibtex).then(() => {
        this.toastService.success('Citation Copied', 'BibTeX entry saved to clipboard.');
      });
    } else {
      this.toastService.info('Citation Format', 'BibTeX citation generated.');
    }
  }

  switchTab(filter: 'all' | 'plates' | 'discussions'): void {
    this.activeFilter.set(filter);
  }

  // Transform real backend posts into rich editorial Archival items
  private transformPostsToArchivalItems(posts: Post[]): ArchivalItem[] {
    return posts.map((p, idx) => {
      const words = (p.body || '').trim().split(/\s+/);
      const title =
        words.length > 8 ? words.slice(0, 8).join(' ') + '...' : p.body || 'Archival Record';
      const shortId = p._id ? p._id.slice(-6).toUpperCase() : `${100 + idx}-GL`;

      // Extract hashtags
      const tags = (p.body || '').match(/#[a-zA-Z0-9_]+/g) || ['#Archival', '#Dispatch'];

      return {
        _id: p._id,
        title,
        body: p.body,
        quote: words.length > 12 ? `"${words.slice(4, 16).join(' ')}..."` : undefined,
        image: p.image,
        authorName: p.user?.name || 'Anonymous Author',
        authorUsername: p.user?.username || 'scholar',
        authorPhoto: p.user?.photo,
        authorMeta: p.user?.username
          ? `@${p.user.username}`
          : `Record ${String(idx + 1).padStart(2, '0')}`,
        archivalId: shortId,
        preservedDate: p.createdAt || new Date().toISOString(),
        citationsCount: p.likesCount ?? 0,
        commentsCount: p.commentsCount ?? 0,
        tags: tags.map((t) => t.trim()),
        hasAttachment: Boolean(p.image),
        doi: p._id ? `doi:10.8412/gthr.arch.${p._id.slice(-6)}` : 'doi:10.8412/gthr.arch',
      };
    });
  }
}
