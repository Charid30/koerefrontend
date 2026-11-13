import { Component, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  private auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly user = this.auth.user;
  menuOuvert = signal(false);

  toggleMenu() {
    this.menuOuvert.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (!el.closest('[data-profil-menu]')) this.menuOuvert.set(false);
  }

  deconnecter() {
    this.auth.logout();
  }
}
