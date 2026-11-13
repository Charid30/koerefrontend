import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user.model';

function confirmerMdp(ctrl: AbstractControl): ValidationErrors | null {
  const mdp = ctrl.get('nouveauMotDePasse')?.value;
  const confirm = ctrl.get('confirmerMotDePasse')?.value;
  return mdp && confirm && mdp !== confirm ? { nonConforme: true } : null;
}

@Component({
  selector: 'app-profil',
  imports: [NgClass, DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc = inject(UsersService);
  private readonly fb = inject(FormBuilder);

  readonly user = this.auth.user;
  /** Profil complet (téléphone, département, dates) chargé depuis l'API */
  readonly profil = signal<User | null>(null);

  readonly loading = signal(false);
  readonly succes = signal('');
  readonly erreur = signal('');
  readonly afficherMdp = signal(false);
  readonly voirMdp = signal(false);

  readonly form = this.fb.group(
    {
      motDePasseActuel: ['', Validators.required],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmerMotDePasse: ['', Validators.required],
    },
    { validators: confirmerMdp },
  );

  private readonly nouveauMdp = toSignal(this.form.controls.nouveauMotDePasse.valueChanges, { initialValue: '' });

  /** Critères affichés en direct sous le nouveau mot de passe */
  readonly criteres = computed(() => {
    const v = this.nouveauMdp() ?? '';
    return [
      { libelle: '8 caractères minimum', ok: v.length >= 8 },
      { libelle: 'Une majuscule et une minuscule', ok: /[a-z]/.test(v) && /[A-Z]/.test(v) },
      { libelle: 'Un chiffre', ok: /\d/.test(v) },
      { libelle: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(v) },
    ];
  });

  readonly force = computed(() => {
    const n = this.criteres().filter((c) => c.ok).length;
    if (!this.nouveauMdp()) return null;
    if (n <= 1) return { niveau: 1, libelle: 'Faible', couleur: 'bg-red-500' };
    if (n <= 3) return { niveau: n, libelle: 'Moyen', couleur: 'bg-amber-400' };
    return { niveau: 4, libelle: 'Solide', couleur: 'bg-green-500' };
  });

  ngOnInit() {
    this.svc.getProfil().subscribe({ next: (p) => this.profil.set(p) });
  }

  initiales(): string {
    const u = this.user();
    return `${u?.prenom?.[0] ?? ''}${u?.nom?.[0] ?? ''}`.toUpperCase();
  }

  ouvrirChangement() {
    this.succes.set('');
    this.afficherMdp.set(true);
  }

  annuler() {
    this.afficherMdp.set(false);
    this.form.reset();
    this.erreur.set('');
  }

  changerMotDePasse() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.succes.set('');
    this.erreur.set('');
    const val = this.form.value;
    this.svc.changerMotDePasse(val.motDePasseActuel!, val.nouveauMotDePasse!).subscribe({
      next: () => {
        this.succes.set('Mot de passe modifié. Vos autres appareils ont été déconnectés par sécurité.');
        this.form.reset();
        this.loading.set(false);
        this.afficherMdp.set(false);
      },
      error: (err) => {
        this.erreur.set(err?.error?.message ?? 'Erreur lors du changement');
        this.loading.set(false);
      },
    });
  }

  roleLabel(role: string): string {
    const m: Record<string, string> = {
      ADMIN: 'Administrateur',
      RESPONSABLE_PARC: 'Responsable parc',
      RESPONSABLE_MAINTENANCE: 'Responsable maintenance',
      MECANICIEN: 'Mécanicien',
      CHAUFFEUR: 'Chauffeur',
      DIRECTION: 'Logistique',
    };
    return m[role] ?? role;
  }

  /** Mêmes couleurs que la page Utilisateurs ; le rouge reste réservé aux alertes. */
  roleColor(role: string): string {
    const m: Record<string, string> = {
      ADMIN: 'bg-primary-50 text-primary-700 ring-primary-600/20',
      RESPONSABLE_PARC: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      RESPONSABLE_MAINTENANCE: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      MECANICIEN: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      CHAUFFEUR: 'bg-teal-50 text-teal-700 ring-teal-600/20',
      DIRECTION: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20',
    };
    return m[role] ?? 'bg-gray-100 text-gray-600 ring-gray-500/20';
  }
}
