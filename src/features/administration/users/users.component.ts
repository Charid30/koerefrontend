import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
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

const ROLE_CLASSES: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  RESPONSABLE_PARC: 'bg-blue-100 text-blue-700',
  RESPONSABLE_MAINTENANCE: 'bg-indigo-100 text-indigo-700',
  MECANICIEN: 'bg-orange-100 text-orange-700',
  CHAUFFEUR: 'bg-teal-100 text-teal-700',
  DIRECTION: 'bg-purple-100 text-purple-700',
};

const ROLE_SUBORDONNES: Partial<Record<Role, Role[]>> = {
  ADMIN:                   ['ADMIN','DIRECTION','RESPONSABLE_PARC','RESPONSABLE_MAINTENANCE','MECANICIEN','CHAUFFEUR'],
  DIRECTION:               ['RESPONSABLE_PARC'],
  RESPONSABLE_PARC:        ['RESPONSABLE_MAINTENANCE'],
  RESPONSABLE_MAINTENANCE: ['MECANICIEN'],
  MECANICIEN:              ['CHAUFFEUR'],
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, NgClass, ReactiveFormsModule, FormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private svc  = inject(UsersService);
  private auth = inject(AuthService);
  private fb   = inject(FormBuilder);

  users      = signal<User[]>([]);
  recherche  = signal('');
  loading    = signal(true);

  usersFiltres = computed(() => {
    const q = this.recherche().toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.prenom.toLowerCase().includes(q) ||
      u.nom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.telephone ?? '').toLowerCase().includes(q) ||
      ROLE_LABELS[u.role].toLowerCase().includes(q)
    );
  });
  showForm = signal(false);
  formLoading = signal(false);
  modeEdition = signal(false);
  erreur = signal('');
  editId = signal<number | null>(null);
  etape = signal(1);

  // Détail
  showDetail   = signal(false);
  userDetail   = signal<User | null>(null);
  voirDetail(u: User) { this.userDetail.set(u); this.showDetail.set(true); }
  fermerDetail() { this.showDetail.set(false); }

  // Reset MDP
  showReset      = signal(false);
  resetUserId    = signal<number | null>(null);
  resetUserNom   = signal('');
  resetMdp       = signal('');
  resetLoading   = signal(false);
  resetErreur    = signal('');
  resetSucces    = signal('');

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly peutCreer = computed(() => this.rolesDisponibles().length > 0);

  peutGerer(u: User): boolean {
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
    prenom:      ['', Validators.required],
    nom:         ['', Validators.required],
    email:       ['', [Validators.required, Validators.email]],
    telephone:   [''],
    departement: [''],
    role:        ['MECANICIEN' as Role, Validators.required],
    motDePasse:  [''],
  });

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (r) => { this.users.set(r.data); this.loading.set(false); },
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
    this.form.patchValue({ prenom: u.prenom, nom: u.nom, email: u.email, telephone: u.telephone ?? '', departement: u.departement ?? '', role: u.role });
    this.etape.set(1);
    this.showForm.set(true);
  }

  fermerFormulaire() { this.showForm.set(false); }

  suivantUser() {
    const ctrls = ['prenom', 'nom', 'email'];
    const invalid = ctrls.some(c => { const ctrl = this.form.get(c); ctrl?.markAsTouched(); return ctrl?.invalid; });
    if (!invalid) this.etape.set(2);
  }
  precedentUser() { this.etape.set(1); }

  sauvegarder() {
    if (this.form.invalid) return;
    this.formLoading.set(true);
    this.erreur.set('');
    const val = this.form.value as any;
    const obs = this.modeEdition()
      ? this.svc.update(this.editId()!, { prenom: val.prenom, nom: val.nom, role: val.role })
      : this.svc.create(val);
    obs.subscribe({
      next: () => { this.fermerFormulaire(); this.formLoading.set(false); this.charger(); },
      error: (e) => { this.formLoading.set(false); this.erreur.set(e?.error?.message ?? 'Une erreur est survenue'); },
    });
  }

  toggleActif(u: User) {
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
  fermerReset() { this.showReset.set(false); }

  confirmerReset() {
    if (this.resetMdp().length < 8) { this.resetErreur.set('8 caractères minimum'); return; }
    this.resetLoading.set(true);
    this.resetErreur.set('');
    this.svc.resetMotDePasse(this.resetUserId()!, this.resetMdp()).subscribe({
      next: () => { this.resetLoading.set(false); this.resetSucces.set('Mot de passe réinitialisé.'); },
      error: (err) => { this.resetErreur.set(err?.error?.message ?? 'Erreur'); this.resetLoading.set(false); },
    });
  }

  roleLabel(role: Role): string { return ROLE_LABELS[role] ?? role; }
  roleClass(role: Role): string { return ROLE_CLASSES[role] ?? 'bg-gray-100 text-gray-600'; }
}
