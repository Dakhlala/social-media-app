import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SidebarComponent } from './sidebar.component';
import { ToastService } from '../../../core/services/toast-service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let router: Router;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fallback to defaultPhoto on photo error', () => {
    const fakeImg = { src: 'https://broken-image.com/test.png' } as HTMLImageElement;
    const fakeEvent = { target: fakeImg } as unknown as Event;

    component.onPhotoError(fakeEvent);

    expect(fakeImg.src).toBe(component.defaultPhoto);
  });

  it('should emit newEntry and navigate or scroll on onNewEntryClick', () => {
    let emitted = false;
    component.newEntry.subscribe(() => {
      emitted = true;
    });

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onNewEntryClick();

    expect(emitted).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/home'], { queryParams: { compose: true } });
  });

  it('should clear session and navigate to sign-in on onSignOut', () => {
    localStorage.setItem('userToken', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Test' }));

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const toastSpy = vi.spyOn(toastService, 'info');

    const fakeEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    component.onSignOut(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(localStorage.getItem('userToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith('Signed Out', expect.any(String));
    expect(navigateSpy).toHaveBeenCalledWith(['/sign-in']);
  });
});
