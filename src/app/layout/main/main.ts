import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileBottomNavComponent } from '../../shared/ui/mobile-bottom-nav/mobile-bottom-nav.component';
import { NavbarComponent } from '../../features/navbar/navbar';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, MobileBottomNavComponent, NavbarComponent],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main { }


