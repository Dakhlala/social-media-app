import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../../../core/services/toast-service';

@Component({
  selector: 'app-toast-component',
  imports: [],
  templateUrl: './toast-component.html',
  styleUrl: './toast-component.css',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService)

  getIconName(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  }

  getIconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'text-primary-fixed-dim';
      case 'error':
        return 'text-tertiary-fixed-dim';
      case 'warning':
        return 'text-amber-300';
      case 'info':
      default:
        return 'text-secondary-fixed';
    }
  }
}
