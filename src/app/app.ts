import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { ToastComponent } from './shared/ui/toast/toast-component/toast-component';
import { filter, first } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('social-media-app');
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.dismissPreloaderWhenReady();
  }

  private dismissPreloaderWhenReady(): void {
    const onReady = () => {
      // Check if browser document.fonts is available and wait for fonts (Newsreader, Material Symbols)
      const fontsPromise =
        typeof document !== 'undefined' && 'fonts' in document
          ? (document as any).fonts.ready
          : Promise.resolve();

      // Ensure slow network never blocks the user longer than 800ms
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 800));

      Promise.race([fontsPromise, timeoutPromise]).then(() => {
        this.hidePreloader();
      });
    };

    if (this.router.navigated) {
      onReady();
    } else {
      this.router.events
        .pipe(
          filter((event) => event instanceof NavigationEnd),
          first()
        )
        .subscribe(() => onReady());
    }
  }

  private hidePreloader(): void {
    if (typeof document === 'undefined') return;
    const preloader = document.getElementById('app-preloader');
    if (!preloader) return;

    preloader.classList.add('preloader-hidden');
    setTimeout(() => {
      preloader.remove();
    }, 450);
  }
}
