import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class App {
  // Instancié dès le démarrage pour appliquer le thème sur toutes les pages, connexion comprise
  private readonly theme = inject(ThemeService);
}
