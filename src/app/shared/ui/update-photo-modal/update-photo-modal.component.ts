import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../../core/services/users-service';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-update-photo-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-photo-modal.component.html',
  styleUrl: './update-photo-modal.component.css',
})
export class UpdatePhotoModalComponent {
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  readonly isOpen = input<boolean>(false);
  readonly imageFile = input<File | null>(null);
  readonly previewUrl = input<string | null>(null);
  readonly currentPhotoUrl = input<string | null>(null);
  readonly userName = input<string>('');

  readonly cancel = output<void>();
  readonly uploaded = output<string>();

  readonly isUploading = signal<boolean>(false);

  readonly defaultPhoto =
    'https://pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev/linkedPosts/default-profile.png';

  onCancel(): void {
    if (!this.isUploading()) {
      this.cancel.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isUploading()) {
      this.cancel.emit();
    }
  }

  onConfirmUpload(): void {
    const file = this.imageFile();
    if (!file || this.isUploading()) return;

    this.isUploading.set(true);

    this.usersService.uploadProfilePhoto(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        const newPhotoUrl = res.data?.photo || (res as any).photo;
        this.toastService.success(
          'Portrait Renewed',
          'Your profile picture has been updated across the Commons.'
        );
        this.uploaded.emit(newPhotoUrl);
      },
      error: () => {
        this.isUploading.set(false);
        this.toastService.error(
          'Upload Failed',
          'Could not upload profile picture. Please try another image file.'
        );
      },
    });
  }
}
