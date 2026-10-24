import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostsService } from '../../../core/services/posts-service';
import { ToastService } from '../../../core/services/toast-service';
import { Post } from '../../../core/models/post.models';

@Component({
  selector: 'app-edit-post-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-post-modal.component.html',
  styleUrl: './edit-post-modal.component.css',
})
export class EditPostModalComponent {
  private readonly postsService = inject(PostsService);
  private readonly toastService = inject(ToastService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isOpen = input<boolean>(false);
  readonly post = input<Post | null>(null);

  readonly close = output<void>();
  readonly saved = output<Post>();

  readonly editBody = signal<string>('');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly existingImageUrl = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);

  constructor() {
    effect(() => {
      const p = this.post();
      const open = this.isOpen();
      if (open && p) {
        this.editBody.set(p.body || '');
        this.existingImageUrl.set(p.image || null);
        this.selectedFile.set(null);
        this.previewUrl.set(null);
      }
    });
  }

  onFileSelected(event: Event): void {
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

  onRemoveNewFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onRemoveExistingImage(): void {
    this.existingImageUrl.set(null);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isSaving()) {
      this.close.emit();
    }
  }

  onCancel(): void {
    if (!this.isSaving()) {
      this.close.emit();
    }
  }

  onSave(): void {
    const currentPost = this.post();
    if (!currentPost || this.isSaving()) return;

    const trimmedBody = this.editBody().trim();
    const hasImage = Boolean(this.selectedFile() || this.existingImageUrl());

    if (!trimmedBody && !hasImage) {
      this.toastService.warning('Empty Dispatch', 'Please provide text or imagery.');
      return;
    }

    this.isSaving.set(true);

    const formData = new FormData();
    formData.append('body', trimmedBody);
    if (this.selectedFile()) {
      formData.append('image', this.selectedFile()!);
    }

    this.postsService.updatePost(currentPost._id, formData).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        const returnedPost = res.data?.post || (res as any).post;

        const updatedPost: Post = {
          ...currentPost,
          body: trimmedBody,
          image: this.previewUrl() || (this.existingImageUrl() ? currentPost.image : undefined),
          ...(returnedPost || {}),
        };

        this.toastService.success('Dispatch Updated', 'Your changes have been saved to the Commons.');
        this.saved.emit(updatedPost);
        this.close.emit();
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Update Failed', 'Could not save your dispatch edits.');
      },
    });
  }
}
