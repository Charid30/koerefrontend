import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'clair' | 'sombre' | 'systeme';

const CLE = 'sofary_theme';

/**
 * Thème de l'interface : clair, sombre ou celui du système.
 * Le choix est appliqué par une classe « dark » sur <html> (voir styles.css).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private requete = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private systemeSombre = signal(this.requete?.matches ?? false);

  readonly choix = signal<Theme>(this.lire());
  readonly sombre = computed(() => this.choix() === 'sombre' || (this.choix() === 'systeme' && this.systemeSombre()));

  constructor() {
    this.requete?.addEventListener('change', (e) => this.systemeSombre.set(e.matches));
    effect(() => {
      const sombre = this.sombre();
      document.documentElement.classList.toggle('dark', sombre);
      document.documentElement.style.colorScheme = sombre ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sombre ? '#0f0a1a' : '#351266');
      try {
        localStorage.setItem(CLE, this.choix());
      } catch {
        /* stockage indisponible */
      }
    });
  }

  /** Bascule simple clair ↔ sombre depuis la barre du haut */
  basculer() {
    this.choix.set(this.sombre() ? 'clair' : 'sombre');
  }

  private lire(): Theme {
    try {
      const v = localStorage.getItem(CLE);
      return v === 'clair' || v === 'sombre' || v === 'systeme' ? v : 'systeme';
    } catch {
      return 'systeme';
    }
  }
}
