import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AmdecService } from '../../core/services/amdec.service';
import { VehiculesService } from '../../core/services/vehicules.service';
import { AmdecAnalyse } from '../../core/models/amdec.model';
import { Vehicule } from '../../core/models/vehicule.model';

import { AuthService } from '../../core/services/auth.service';
import { Action } from '../../core/auth/permissions';
@Component({
  selector: 'app-amdec',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './amdec.component.html',
})
export class AmdecComponent implements OnInit {
  private readonly authPermissions = inject(AuthService);
  /** Bouton visible seulement si l'API autorise l'action pour ce rôle */
  peut(action: Action): boolean {
    return this.authPermissions.peut(action);
  }

  private svc = inject(AmdecService);
  private vehiculesSvc = inject(VehiculesService);
  private fb = inject(FormBuilder);

  vehicules = signal<Vehicule[]>([]);
  analyses = signal<AmdecAnalyse[]>([]);
  loading = signal(false);
  showForm = signal(false);
  formLoading = signal(false);
  vehiculeIdSelectionne = '';
  analyseAEditer = signal<AmdecAnalyse | null>(null);

  form = this.fb.group({
    composant: ['', Validators.required],
    modeDefaillance: ['', Validators.required],
    effet: ['', Validators.required],
    cause: ['', Validators.required],
    frequence: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    gravite: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    detectabilite: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    actionsRecommandees: [''],
  });

  iprCalcule = signal(1);

  ngOnInit() {
    this.vehiculesSvc.getAll({ limit: 100 }).subscribe({ next: (r) => this.vehicules.set(r.data) });

    // Recalculer l'IPR à chaque changement du formulaire
    this.form.valueChanges.subscribe((val) => {
      const f = Number(val.frequence ?? 1);
      const g = Number(val.gravite ?? 1);
      const d = Number(val.detectabilite ?? 1);
      this.iprCalcule.set(f * g * d);
    });
  }

  // ── Sélection du véhicule ────────────────────────────────────────────────
  readonly vehiculeId = signal<number | null>(null);
  readonly vehiculeChoisi = computed(() => this.vehicules().find((v) => v.id === this.vehiculeId()) ?? null);

  choisirVehicule(id: number | string | null) {
    const n = id ? Number(id) : null;
    this.vehiculeId.set(n);
    this.vehiculeIdSelectionne = n ? String(n) : '';
    this.analyses.set([]);
    this.ouvertes.set(new Set());
    if (n) this.charger(n);
  }

  // ── Lecture des analyses ─────────────────────────────────────────────────
  readonly analysesTriees = computed(() => [...this.analyses()].sort((a, b) => b.ipr - a.ipr));

  readonly synthese = computed(() => {
    const a = this.analyses();
    return {
      total: a.length,
      iprMax: a.length ? Math.max(...a.map((x) => x.ipr)) : 0,
      critiques: a.filter((x) => x.ipr >= 80).length,
      eleves: a.filter((x) => x.ipr >= 40 && x.ipr < 80).length,
    };
  });

  /** Matrice de criticité Gravité × Fréquence (5 × 5), gravité forte en haut. */
  readonly echelle = [1, 2, 3, 4, 5];
  readonly matrice = computed(() => {
    const cases: Record<string, number> = {};
    for (const a of this.analyses()) cases[`${a.gravite}-${a.frequence}`] = (cases[`${a.gravite}-${a.frequence}`] ?? 0) + 1;
    return cases;
  });

  zoneClass(gravite: number, frequence: number): string {
    const c = gravite * frequence;
    if (c >= 15) return 'bg-red-100 text-red-900';
    if (c >= 8) return 'bg-amber-100 text-amber-900';
    return 'bg-green-50 text-green-900';
  }

  readonly ouvertes = signal<Set<number>>(new Set());
  basculer(id: number) {
    const s = new Set(this.ouvertes());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.ouvertes.set(s);
  }

  niveauIcone(ipr: number): 'critique' | 'attention' | 'ok' {
    if (ipr >= 40) return 'critique';
    if (ipr >= 20) return 'attention';
    return 'ok';
  }

  charger(vehiculeId: any) {
    if (!vehiculeId) return;
    this.loading.set(true);
    this.svc.getByVehicule(Number(vehiculeId)).subscribe({
      next: (a) => {
        this.analyses.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ouvrirEdit(a: AmdecAnalyse) {
    this.analyseAEditer.set(a);
    this.form.patchValue({
      composant: a.composant,
      modeDefaillance: a.modeDefaillance,
      effet: a.effet,
      cause: a.cause,
      frequence: a.frequence,
      gravite: a.gravite,
      detectabilite: a.detectabilite,
      actionsRecommandees: a.actionsRecommandees ?? '',
    });
    this.iprCalcule.set(a.ipr);
    this.showForm.set(true);
  }

  // Modal confirmation
  confirmMsg = signal('');
  confirmAction = signal<(() => void) | null>(null);
  showConfirm = signal(false);

  demanderConfirmation(msg: string, action: () => void) {
    this.confirmMsg.set(msg);
    this.confirmAction.set(action);
    this.showConfirm.set(true);
  }
  annulerConfirm() {
    this.showConfirm.set(false);
    this.confirmAction.set(null);
  }
  validerConfirm() {
    const fn = this.confirmAction();
    if (fn) fn();
    this.showConfirm.set(false);
    this.confirmAction.set(null);
  }

  supprimer(a: AmdecAnalyse) {
    this.demanderConfirmation(
      `Supprimer l'analyse "${a.composant} — ${a.modeDefaillance}" ? Cette action est irréversible.`,
      () =>
        this.svc.delete(a.id).subscribe({ next: () => this.charger(this.vehiculeIdSelectionne) }),
    );
  }

  ouvrirFormulaire() {
    this.analyseAEditer.set(null);
    this.form.reset({ frequence: 1, gravite: 1, detectabilite: 1 });
    this.iprCalcule.set(1);
    this.showForm.set(true);
  }

  fermerFormulaire() {
    this.showForm.set(false);
    this.analyseAEditer.set(null);
  }

  sauvegarder() {
    if (this.form.invalid) return;
    this.formLoading.set(true);
    const val = this.form.value as any;
    const editing = this.analyseAEditer();

    const obs = editing
      ? this.svc.update(editing.id, val)
      : this.svc.create({ ...val, vehiculeId: Number(this.vehiculeIdSelectionne) });

    obs.subscribe({
      next: () => {
        this.fermerFormulaire();
        this.formLoading.set(false);
        this.charger(this.vehiculeIdSelectionne);
      },
      error: () => this.formLoading.set(false),
    });
  }

  iprClass(ipr: number): string {
    if (ipr >= 80) return 'text-red-600';
    if (ipr >= 40) return 'text-orange-500';
    if (ipr >= 20) return 'text-yellow-500';
    return 'text-green-600';
  }

  niveauLabel(ipr: number): string {
    if (ipr >= 80) return 'Critique';
    if (ipr >= 40) return 'Élevé';
    if (ipr >= 20) return 'Moyen';
    return 'Faible';
  }

  niveauClass(ipr: number): string {
    if (ipr >= 80) return 'bg-red-50 text-red-700 ring-red-600/20';
    if (ipr >= 40) return 'bg-orange-50 text-orange-700 ring-orange-600/20';
    if (ipr >= 20) return 'bg-amber-50 text-amber-800 ring-amber-600/25';
    return 'bg-green-50 text-green-700 ring-green-600/20';
  }
}
