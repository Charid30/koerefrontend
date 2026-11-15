import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { User, Role } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  RESPONSABLE_PARC: 'Resp. Parc',
  RESPONSABLE_MAINTENANCE: 'Resp. Maintenance',
  MECANICIEN: 'Mécanicien',
  CHAUFFEUR: 'Chauffeur',
  DIRECTION: 'Logistique',
};

/** Couleurs de rôle : le rouge est réservé aux alertes, l'admin prend le violet de la marque. */
const ROLE_CLASSES: Record<Role, string> = {
  ADMIN: 'bg-primary-50 text-primary-700 ring-primary-600/20',
  RESPONSABLE_PARC: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  RESPONSABLE_MAINTENANCE: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  MECANICIEN: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  CHAUFFEUR: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  DIRECTION: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20',
};

const ROLE_DOTS: Record<Role, string> = {
  ADMIN: 'bg-primary-500',
  RESPONSABLE_PARC: 'bg-blue-500',
  RESPONSABLE_MAINTENANCE: 'bg-sky-500',
  MECANICIEN: 'bg-orange-500',
  CHAUFFEUR: 'bg-teal-500',
  DIRECTION: 'bg-fuchsia-500',
};

export type FiltreStatut = 'tous' | 'actifs' | 'inactifs';

const ROLE_SUBORDONNES: Partial<Record<Role, Role[]>> = {
  ADMIN: [
    'ADMIN',
    'DIRECTION',
    'RESPONSABLE_PARC',
    'RESPONSABLE_MAINTENANCE',
    'MECANICIEN',
    'CHAUFFEUR',
  ],
  DIRECTION: ['RESPONSABLE_PARC'],
  RESPONSABLE_PARC: ['RESPONSABLE_MAINTENANCE'],
  RESPONSABLE_MAINTENANCE: ['MECANICIEN'],
  MECANICIEN: ['CHAUFFEUR'],
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, NgClass, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private svc = inject(UsersService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  users = signal<User[]>([]);
  recherche = signal('');
  loading = signal(true);

  filtreRole = signal<Role | null>(null);
  filtreStatut = signal<FiltreStatut>('tous');
  readonly statuts: { v: FiltreStatut; t: string }[] = [
    { v: 'tous', t: 'Tous' },
    { v: 'actifs', t: 'Actifs' },
    { v: 'inactifs', t: 'Inactifs' },
  ];

  readonly monId = computed(() => this.auth.user()?.id ?? null);

  usersFiltres = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    const role = this.filtreRole();
    const statut = this.filtreStatut();
    return this.users()
      .filter((u) => !role || u.role === role)
      .filter((u) => statut === 'tous' || (statut === 'actifs' ? u.actif : !u.actif))
      .filter(
        (u) =>
          !q ||
          u.prenom.toLowerCase().includes(q) ||
          u.nom.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.telephone ?? '').toLowerCase().includes(q) ||
          (u.departement ?? '').toLowerCase().includes(q) ||
          ROLE_LABELS[u.role].toLowerCase().includes(q),
      )
      .sort((a, b) => Number(b.actif) - Number(a.actif) || a.nom.localeCompare(b.nom, 'fr'));
  });

  /** Rôles présents, avec leur effectif, pour les filtres. */
  readonly compteRoles = computed(() => {
    const compte = new Map<Role, number>();
    for (const u of this.users()) compte.set(u.role, (compte.get(u.role) ?? 0) + 1);
    return (Object.keys(ROLE_LABELS) as Role[])
      .filter((r) => compte.has(r))
      .map((r) => ({ value: r, label: ROLE_LABELS[r], total: compte.get(r)! }));
  });

  readonly stats = computed(() => {
    const u = this.users();
    const actifs = u.filter((x) => x.actif).length;
    const il30j = Date.now() - 30 * 86_400_000;
    return {
      total: u.length,
      actifs,
      inactifs: u.length - actifs,
      jamaisConnectes: u.filter((x) => !x.derniereConnexion).length,
      actifs30j: u.filter((x) => x.derniereConnexion && new Date(x.derniereConnexion).getTime() >= il30j).length,
    };
  });

  readonly filtresActifs = computed(
    () => !!this.recherche() || !!this.filtreRole() || this.filtreStatut() !== 'tous',
  );

  reinitialiserFiltres() {
    this.recherche.set('');
    this.filtreRole.set(null);
    this.filtreStatut.set('tous');
  }

  estMoi(u: User): boolean {
    return u.id === this.monId();
  }

  /** « il y a 3 h », « hier », « il y a 12 j »… */
  derniereConnexion(date?: string | null): string {
    if (!date) return 'Jamais connecté';
    const diff = (new Date(date).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const abs = Math.abs(diff);
    if (abs < 60) return 'À l’instant';
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 30 * 86_400) return rtf.format(Math.round(diff / 86_400), 'day');
    if (abs < 365 * 86_400) return rtf.format(Math.round(diff / (30 * 86_400)), 'month');
    return rtf.format(Math.round(diff / (365 * 86_400)), 'year');
  }

  // Confirmation de désactivation
  aDesactiver = signal<User | null>(null);
  showForm = signal(false);
  formLoading = signal(false);
  modeEdition = signal(false);
  erreur = signal('');
  editId = signal<number | null>(null);
  etape = signal(1);

  // Détail
  showDetail = signal(false);
  userDetail = signal<User | null>(null);
  voirDetail(u: User) {
    this.userDetail.set(u);
    this.showDetail.set(true);
  }
  fermerDetail() {
    this.showDetail.set(false);
  }

  // Reset MDP
  showReset = signal(false);
  resetUserId = signal<number | null>(null);
  resetUserNom = signal('');
  resetMdp = signal('');
  resetLoading = signal(false);
  resetErreur = signal('');
  resetSucces = signal('');

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly peutCreer = computed(() => this.rolesDisponibles().length > 0);

  peutGerer(u: User): boolean {
    if (this.estMoi(u)) return false;
    const monRole = this.auth.role() as Role | null;
    if (!monRole) return false;
    const subordonnes = ROLE_SUBORDONNES[monRole] ?? [];
    return subordonnes.includes(u.role);
  }

  readonly rolesDisponibles = computed(() => {
    const monRole = this.auth.role() as Role | null;
    const autorises = monRole ? (ROLE_SUBORDONNES[monRole] ?? []) : [];
    return Object.entries(ROLE_LABELS)
      .filter(([v]) => autorises.includes(v as Role))
      .map(([value, label]) => ({ value: value as Role, label }));
  });

  roles = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value: value as Role, label }));

  form = this.fb.group({
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    departement: [''],
    role: ['MECANICIEN' as Role, Validators.required],
    motDePasse: [''],
  });

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (r) => {
        this.users.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ouvrirFormulaire() {
    this.modeEdition.set(false);
    this.editId.set(null);
    this.erreur.set('');
    this.form.reset({ role: 'MECANICIEN' });
    this.form.get('motDePasse')!.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('motDePasse')!.updateValueAndValidity();
    this.etape.set(1);
    this.showForm.set(true);
  }

  ouvrirEdition(u: User) {
    this.modeEdition.set(true);
    this.editId.set(u.id);
    this.erreur.set('');
    this.form.get('motDePasse')!.clearValidators();
    this.form.get('motDePasse')!.updateValueAndValidity();
    this.form.patchValue({
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone ?? '',
      departement: u.departement ?? '',
      role: u.role,
    });
    this.etape.set(1);
    this.showForm.set(true);
  }

  fermerFormulaire() {
    this.showForm.set(false);
  }

  suivantUser() {
    const ctrls = ['prenom', 'nom', 'email'];
    const invalid = ctrls.some((c) => {
      const ctrl = this.form.get(c);
      ctrl?.markAsTouched();
      return ctrl?.invalid;
    });
    if (!invalid) this.etape.set(2);
  }
  precedentUser() {
    this.etape.set(1);
  }

  sauvegarder() {
    if (this.form.invalid) return;
    this.formLoading.set(true);
    this.erreur.set('');
    const val = this.form.value as any;
    const obs = this.modeEdition()
      ? this.svc.update(this.editId()!, {
          prenom: val.prenom,
          nom: val.nom,
          role: val.role,
          // Téléphone et département sont modifiables dans le formulaire : ils doivent être envoyés
          telephone: val.telephone ?? '',
          departement: val.departement ?? '',
        })
      : this.svc.create(val);
    obs.subscribe({
      next: () => {
        this.fermerFormulaire();
        this.formLoading.set(false);
        this.charger();
      },
      error: (e) => {
        this.formLoading.set(false);
        this.erreur.set(e?.error?.message ?? 'Une erreur est survenue');
      },
    });
  }

  /** Désactiver demande confirmation ; réactiver est immédiat. */
  toggleActif(u: User) {
    if (u.actif) {
      this.aDesactiver.set(u);
      return;
    }
    this.svc.toggleActif(u.id).subscribe({ next: () => this.charger() });
  }

  confirmerDesactivation() {
    const u = this.aDesactiver();
    if (!u) return;
    this.aDesactiver.set(null);
    this.svc.toggleActif(u.id).subscribe({ next: () => this.charger() });
  }

  ouvrirReset(u: User) {
    this.resetUserId.set(u.id);
    this.resetUserNom.set(`${u.prenom} ${u.nom}`);
    this.resetMdp.set('');
    this.resetErreur.set('');
    this.resetSucces.set('');
    this.showReset.set(true);
  }
  fermerReset() {
    this.showReset.set(false);
  }

  confirmerReset() {
    if (this.resetMdp().length < 8) {
      this.resetErreur.set('8 caractères minimum');
      return;
    }
    this.resetLoading.set(true);
    this.resetErreur.set('');
    this.svc.resetMotDePasse(this.resetUserId()!, this.resetMdp()).subscribe({
      next: () => {
        this.resetLoading.set(false);
        this.resetSucces.set('Mot de passe réinitialisé.');
      },
      error: (err) => {
        this.resetErreur.set(err?.error?.message ?? 'Erreur');
        this.resetLoading.set(false);
      },
    });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }
  roleClass(role: Role): string {
    return ROLE_CLASSES[role] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20';
  }
  roleDot(role: Role): string {
    return ROLE_DOTS[role] ?? 'bg-gray-400';
  }
}
