import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';

type Etat = 'verification' | 'disponible' | 'indisponible';

@Component({
  selector: 'app-application-mobile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './application-mobile.component.html',
})
export class ApplicationMobileComponent implements OnInit {
  /** L'APK est servie par le serveur web depuis deploy/telechargements/sofary.apk */
  readonly apkChemin = '/downloads/sofary.apk';
  readonly apkUrl = `${location.origin}${this.apkChemin}`;

  etat = signal<Etat>('verification');
  taille = signal<string | null>(null);
  copie = signal(false);

  readonly etapes = [
    { titre: 'Télécharger', desc: 'Touchez « Télécharger l’application » depuis le téléphone, ou scannez l’adresse ci-dessous.' },
    { titre: 'Autoriser l’installation', desc: 'Android demande d’autoriser les applications de cette source : acceptez pour ce navigateur.' },
    { titre: 'Installer', desc: 'Ouvrez le fichier sofary.apk depuis les téléchargements et confirmez l’installation.' },
    { titre: 'Se connecter', desc: 'Lancez SOFARY et utilisez les mêmes identifiants que sur le site.' },
  ];

  ngOnInit() {
    // Vérifie que l'APK a bien été déposée sur le serveur avant de proposer le lien
    fetch(this.apkChemin, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        const type = r.headers.get('content-type') ?? '';
        if (r.ok && !type.includes('text/html')) {
          const octets = Number(r.headers.get('content-length') ?? 0);
          if (octets) this.taille.set(`${(octets / 1024 / 1024).toFixed(1)} Mo`);
          this.etat.set('disponible');
        } else {
          this.etat.set('indisponible');
        }
      })
      .catch(() => this.etat.set('indisponible'));
  }

  copierLien() {
    navigator.clipboard?.writeText(this.apkUrl).then(() => {
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2000);
    });
  }
}
