import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-application-mobile',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './application-mobile.component.html',
})
export class ApplicationMobileComponent {
  readonly apkUrl = 'http://13.140.173.130/downloads/koere.apk';
  readonly version = '1.0.0';

  readonly steps = [
    {
      num: 1,
      titre: "Télécharger l'APK",
      desc: "Cliquez sur le bouton ci-dessous pour télécharger l'application.",
    },
    {
      num: 2,
      titre: 'Autoriser les sources inconnues',
      desc: 'Sur Android, allez dans Paramètres → Sécurité → Activer "Sources inconnues" ou "Installer des apps inconnues".',
    },
    {
      num: 3,
      titre: "Installer l'application",
      desc: "Ouvrez le fichier téléchargé (.apk) et suivez les instructions d'installation.",
    },
    {
      num: 4,
      titre: 'Se connecter',
      desc: 'Lancez SOFARY et connectez-vous avec vos identifiants habituels.',
    },
  ];

  copyUrl() {
    navigator.clipboard.writeText(this.apkUrl);
  }
}
