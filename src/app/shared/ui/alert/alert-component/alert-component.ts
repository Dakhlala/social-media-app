import { Component, computed, input, output } from '@angular/core';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-alert-component',
  imports: [],
  templateUrl: './alert-component.html',
  styleUrl: './alert-component.css',
})
export class AlertComponent {
  readonly type = input<AlertType>('info');


  readonly title = input<string>('');

  readonly message = input<string>('');

  readonly icon = input<string | null>(null);


  readonly dismissible = input<boolean>(true);


  readonly dismiss = output<void>();

  readonly resolvedIcon = computed((): string => {
    if (this.icon()) return this.icon()!;

    const type = this.type();
    if (type === 'success') {
      return 'check_circle';
    } else if (type === 'error') {
      return 'error';
    } else if (type === 'warning') {
      return 'warning';
    } else {
      return 'info';
    }
  });

  readonly config = computed(() => {
    const type = this.type();

    if (type === 'success') {
      return {
        containerClass: 'bg-surface-container-low border-primary/30 text-on-surface',
        accentBarClass: 'bg-primary',
        iconBadgeClass: 'bg-primary-fixed text-primary',
        titleClass: 'text-primary',
        messageClass: 'text-on-surface-variant',
        closeBtnClass: 'text-secondary hover:text-on-surface',
      };
    } else if (type === 'error') {
      return {
        containerClass: 'bg-error-container/30 border-error/30 text-on-error-container',
        accentBarClass: 'bg-error',
        iconBadgeClass: 'bg-error-container text-error',
        titleClass: 'text-on-error-container',
        messageClass: 'text-secondary',
        closeBtnClass: 'text-secondary hover:text-on-surface',
      };
    } else if (type === 'warning') {
      return {
        containerClass: 'bg-amber-500/10 border-amber-500/30',
        accentBarClass: 'bg-amber-600',
        iconBadgeClass: 'bg-amber-100 text-amber-800',
        titleClass: 'text-amber-900',
        messageClass: 'text-amber-800',
        closeBtnClass: 'text-amber-700 hover:text-amber-900',
      };
    } else {
      return {
        containerClass: 'bg-surface-container border-outline-variant text-on-surface',
        accentBarClass: 'bg-secondary',
        iconBadgeClass: 'bg-surface-container-high text-secondary',
        titleClass: 'text-on-surface',
        messageClass: 'text-secondary',
        closeBtnClass: 'text-secondary hover:text-on-surface',
      };
    }
  });
}
