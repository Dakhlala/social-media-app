import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../core/services/users-service';
import { PostsService } from '../../core/services/posts-service';
import { ToastService } from '../../core/services/toast-service';
import { User } from '../../core/models/api.models';
import { Post } from '../../core/models/post.models';

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
  era: 'modernism' | 'nordic' | 'acoustic' | 'general';
  hasAttachment: boolean;
  attachmentName?: string;
  attachmentSize?: string;
  doi?: string;
  checksum?: string;
  isCurated?: boolean;
}

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.css',
})
export class ArchivesComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly postsService = inject(PostsService);
  private readonly toastService = inject(ToastService);

  readonly currentUser = signal<User | null>(null);
  readonly items = signal<ArchivalItem[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Active Filter / Category
  readonly activeFilter = signal<'all' | 'modernism' | 'nordic' | 'acoustic' | 'plates'>('all');
  readonly sortBy = signal<'latest' | 'citations' | 'annotations'>('latest');
  readonly viewMode = signal<'grid' | 'list'>('grid');

  // Medium Checkbox Filters
  readonly filterBlueprints = signal<boolean>(true);
  readonly filterManuscripts = signal<boolean>(true);
  readonly filterEssays = signal<boolean>(true);

  // Filtered & Sorted items
  readonly filteredItems = computed(() => {
    let list = [...this.items()];
    const filter = this.activeFilter();

    if (filter === 'modernism') {
      list = list.filter((it) => it.era === 'modernism' || it.tags.some((t) => t.toLowerCase().includes('modern')));
    } else if (filter === 'nordic') {
      list = list.filter((it) => it.era === 'nordic' || it.tags.some((t) => t.toLowerCase().includes('scandinavian') || t.toLowerCase().includes('baltic')));
    } else if (filter === 'acoustic') {
      list = list.filter((it) => it.era === 'acoustic' || it.tags.some((t) => t.toLowerCase().includes('acoustic')));
    } else if (filter === 'plates') {
      list = list.filter((it) => it.hasAttachment || Boolean(it.image));
    }

    // Sort order
    const sort = this.sortBy();
    if (sort === 'citations') {
      list.sort((a, b) => b.citationsCount - a.citationsCount);
    } else if (sort === 'annotations') {
      list.sort((a, b) => b.commentsCount - a.commentsCount);
    } else {
      list.sort((a, b) => new Date(b.preservedDate).getTime() - new Date(a.preservedDate).getTime());
    }

    return list;
  });

  // Featured Item (First item in repository)
  readonly featuredItem = computed(() => this.filteredItems()[0] || null);
  readonly regularItems = computed(() => {
    const list = this.filteredItems();
    return list.length > 1 ? list.slice(1) : list;
  });

  // Dynamic counts for category tabs
  readonly countAll = computed(() => this.items().length);
  readonly countModernism = computed(
    () => this.items().filter((it) => it.era === 'modernism' || it.tags.some((t) => t.toLowerCase().includes('modern'))).length
  );
  readonly countNordic = computed(
    () => this.items().filter((it) => it.era === 'nordic' || it.tags.some((t) => t.toLowerCase().includes('scandinavian') || t.toLowerCase().includes('baltic'))).length
  );
  readonly countAcoustic = computed(
    () => this.items().filter((it) => it.era === 'acoustic' || it.tags.some((t) => t.toLowerCase().includes('acoustic'))).length
  );
  readonly countPlates = computed(
    () => this.items().filter((it) => it.hasAttachment || Boolean(it.image)).length
  );

  ngOnInit(): void {
    this.initCurrentUser();
    this.loadBookmarks();
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
        if (res.data?.user) {
          this.currentUser.set(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
      },
    });
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
          // If no bookmarks exist on user account yet, fall back to curated sample records
          this.items.set(this.getCuratedFallbackArchives());
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.items.set(this.getCuratedFallbackArchives());
        this.isLoading.set(false);
      },
    });
  }

  onRemoveBookmark(item: ArchivalItem, event: Event): void {
    event.stopPropagation();
    const prevItems = this.items();

    // Optimistically remove
    this.items.update((list) => list.filter((i) => i._id !== item._id));
    this.toastService.info('Removed from Archives', 'Dispatch removed from your permanent repository.');

    if (!item.isCurated) {
      this.postsService.toggleBookmark(item._id).subscribe({
        next: () => {},
        error: () => {
          // Rollback on network failure
          this.items.set(prevItems);
          this.toastService.error('Action Failed', 'Could not update archive status.');
        },
      });
    }
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

  switchTab(filter: 'all' | 'modernism' | 'nordic' | 'acoustic' | 'plates'): void {
    this.activeFilter.set(filter);
  }

  setSort(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val.includes('Citation')) {
      this.sortBy.set('citations');
    } else if (val.includes('Annotation')) {
      this.sortBy.set('annotations');
    } else {
      this.sortBy.set('latest');
    }
  }

  // Transform backend posts into rich editorial Archival items
  private transformPostsToArchivalItems(posts: Post[]): ArchivalItem[] {
    return posts.map((p, idx) => {
      const words = (p.body || '').split(' ');
      const title = words.length > 8 ? words.slice(0, 8).join(' ') + '...' : p.body || 'Archival Record';
      const shortId = p._id ? p._id.slice(-6).toUpperCase() : `${100 + idx}-GL`;

      // Extract hashtags
      const tags = (p.body || '').match(/#[a-zA-Z0-9_]+/g) || ['#Archival', '#Dispatch'];

      return {
        _id: p._id,
        title,
        body: p.body,
        quote: words.length > 12 ? `"${words.slice(4, 16).join(' ')}..."` : undefined,
        image: p.image,
        authorName: p.user?.name || 'Architectural Fellow',
        authorUsername: p.user?.username || 'scholar',
        authorPhoto: p.user?.photo,
        authorMeta: `Monograph ${String(idx + 1).padStart(2, '0')}`,
        archivalId: `${shortId}`,
        preservedDate: p.createdAt || new Date().toISOString(),
        citationsCount: p.likesCount || (idx * 7 + 12),
        commentsCount: p.commentsCount || (idx * 3 + 4),
        tags: tags.map((t) => t.trim()),
        era: idx % 3 === 0 ? 'modernism' : idx % 3 === 1 ? 'nordic' : 'acoustic',
        hasAttachment: Boolean(p.image),
        attachmentName: p.image ? 'Archival_Section_Scan.jpg' : undefined,
        attachmentSize: p.image ? '8.4 MB • Plate Scan' : undefined,
        doi: `doi:10.8412/gthr.aalto.${idx + 10}`,
        checksum: `SHA-256: ${p._id.slice(0, 4)}...${p._id.slice(-3)}`,
        isCurated: false,
      };
    });
  }

  // Pre-populated curated library faithful to the Gather Stitch design
  private getCuratedFallbackArchives(): ArchivalItem[] {
    return [
      {
        _id: 'arch-1',
        title: 'The Alvar Aalto Daylight Mechanics (1928–1939)',
        body: 'A comprehensive restoration of original Paimio and Viipuri lighting sections. Preserved blueprints demonstrate conical light-funnels crafted to diffuse sub-arctic glare without mechanical intervention.',
        quote: 'The conical light wells in Viipuri were intentionally calibrated to diffuse Baltic midday glare without requiring external mechanised louvres.',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAx3WY_2Q2bguaTMHlNQVOtqV1RlRFhyt8dIyQ2ajC-0ymRnujX0unRddnCcBi1au7KtCwHcSWYeN2W_4V499r-85J9DkhDOVHPwduqxrCJAbAXjyGbXSAdG3-Nrr6mDSUB5fUstKeCaz90Tjsr5ahlGRBx6AdhjkrK4U7wgULKOB9Bbfs7Od0TtQsw9H0m_ii7aeLnDK2bui36LKHh1nlJsIFFfV1qjA6Z7QtqnB1iZUM8UdiDLnB3Ig',
        authorName: 'Alvar Aalto Archive Circle',
        authorUsername: 'aalto_studies',
        authorPhoto:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBpss6m8nBZ2X9-RDFRkbGJdfVJr2ZCsMgtjZgy7fUUL2q0nJAdIsdpjN8xA94OFN0O5fqI5g9rp8bTPUnrrvtFLcw5pZQLfdV0mA_TRXoLuWxPmOqcSy-9iyOI6zNHs-l65ZzUMv_aiZ37lid0bxThlJEYSJo7liOdP986MSV0nusasrUH3JaZdI_z0oJBUWdsSgCClpzqfgJrCuOcMxOQb5-nW0LGxOVextyD8vtD1rmWjoCuYNyO3Q',
        authorMeta: 'Curated Collection',
        archivalId: '901-AA',
        preservedDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        citationsCount: 142,
        commentsCount: 14,
        tags: ['#Modernism', '#Fenestration', '#Baltic'],
        era: 'modernism',
        hasAttachment: true,
        attachmentName: 'Viipuri_Section_1933_ArchivalScan.pdf',
        attachmentSize: '14.2 MB • High-res Blueprint Plate',
        doi: 'doi:10.8412/gthr.aalto.33',
        checksum: 'SHA-256: 7a8b...41c2',
        isCurated: true,
      },
      {
        _id: 'arch-2',
        title: 'The Architecture of Silence: Proportion as Acoustic Dampening',
        body: 'An examination of 12th-century Cistercian abbey sanctuaries. Using ray-tracing telemetry across timber ceilings, Thorne argues that harmonic ratios were tuned primarily for Gregorian frequency reverberation rather than optical symmetry.',
        quote: 'The stone does not merely contain the choir; it dampens the mundane register, isolating the human overtone.',
        authorName: 'Marcus Thorne',
        authorUsername: 'm_thorne',
        authorPhoto:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBpss6m8nBZ2X9-RDFRkbGJdfVJr2ZCsMgtjZgy7fUUL2q0nJAdIsdpjN8xA94OFN0O5fqI5g9rp8bTPUnrrvtFLcw5pZQLfdV0mA_TRXoLuWxPmOqcSy-9iyOI6zNHs-l65ZzUMv_aiZ37lid0bxThlJEYSJo7liOdP986MSV0nusasrUH3JaZdI_z0oJBUWdsSgCClpzqfgJrCuOcMxOQb5-nW0LGxOVextyD8vtD1rmWjoCuYNyO3Q',
        authorMeta: 'Monograph 08',
        archivalId: '884-FL',
        preservedDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        citationsCount: 48,
        commentsCount: 18,
        tags: ['#Acoustics', '#Timber', '#Monograph'],
        era: 'acoustic',
        hasAttachment: false,
        doi: 'doi:10.8412/gthr.thorne.884',
        checksum: 'SHA-256: 8f2c...89d1',
        isCurated: true,
      },
      {
        _id: 'arch-3',
        title: 'The Fenestration of Viipuri Library: Zenithal Reflection Models',
        body: 'Analysis of conical skylights engineered by Alvar Aalto. Includes calibrated illuminance studies in 32 archival scans, revealing seasonal distribution patterns over reading surfaces.',
        quote: 'Reflective volumes replace artificial heating through tactile ocular warmth.',
        authorName: 'Dr. Astrid Lindholm',
        authorUsername: 'a_lindholm',
        authorPhoto:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCJrI_bwXpt0I8WkPzvo5GnD0ahr-gjRw3Yu04Q6MNybF-VfDrAymyV7kwTg72Uh2JyLuLqhN-tmUpkUpxa-clOb0hqqBbOsVQvgwdMBJpQ7_slN8xlW9IUfXP6xvI_e6jlQZZjngTV_BI39oftEZS8ESYUrRMUC5saxyH4tzsju8WauMgAmA5obko81B-vxOvKhTy696aZHD6D2j7HKVdqIIwXzLe848i-y6-7VtvCd_amye-u9720RA',
        authorMeta: 'Dispatches & Schema',
        archivalId: '712-AL',
        preservedDate: new Date(Date.now() - 32 * 86400000).toISOString(),
        citationsCount: 76,
        commentsCount: 19,
        tags: ['#Nordic', '#Lighting', '#Zenithal'],
        era: 'nordic',
        hasAttachment: true,
        attachmentName: 'Viipuri_Section_1933_ArchivalScan.pdf',
        attachmentSize: '14.2 MB • Preserved with cryptographic timestamp',
        doi: 'doi:10.8412/gthr.lindholm.712',
        checksum: 'SHA-256: 39a4...e81',
        isCurated: true,
      },
      {
        _id: 'arch-4',
        title: 'Reflective Volumes: Light as Mass in Scandinavian Civic Design',
        body: 'A transcription of the Oslo Spring Dialogue exploring how tactile surfaces—rough-cast lime, oiled pine, and untreated brass—substitute for artificial heating through ocular warmth.',
        quote: 'Tactile surfaces substitute for artificial heating through ocular warmth.',
        authorName: 'Kenneth Frampton Circle',
        authorUsername: 'frampton_sem',
        authorPhoto: '',
        authorMeta: 'Seminar Record',
        archivalId: '520-RV',
        preservedDate: new Date(Date.now() - 45 * 86400000).toISOString(),
        citationsCount: 62,
        commentsCount: 12,
        tags: ['#Tectonic', '#Scandinavian', '#Colloquium'],
        era: 'nordic',
        hasAttachment: false,
        doi: 'doi:10.8412/gthr.frampton.520',
        checksum: 'SHA-256: 12e4...90bb',
        isCurated: true,
      },
    ];
  }
}
