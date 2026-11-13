import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehiculesService } from '../../../core/services/vehicules.service';

@Component({
  selector: 'app-vehicule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './vehicule-form.component.html',
})
export class VehiculeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(VehiculesService);

  isEdit = false;
  private vehiculeId?: number;
  loading   = signal(false);
  erreurServeur = signal('');
  entites   = signal<string[]>([]);

  form = this.fb.group({
    numeroInterne:    ['', Validators.required],
    immatriculation:  ['', Validators.required],
    marque:           ['', Validators.required],
    modele:           ['', Validators.required],
    typeVehicule:     ['', Validators.required],
    numeroSerie:      ['', Validators.required],
    annee:            [null as number | null],
    carburant:        [''],
    couleur:          [''],
    kilometrage:      [0],
    heuresMoteur:     [0],
    dateAcquisition:  [''],
    entite:           [''],
    departement:      [''],
    siteGeographique: [''],
    statut:           ['DISPONIBLE'],
    notes:            [''],
  });

  types = [
    { value: 'VOITURE',            label: 'Voiture' },
    { value: 'CAMION',             label: 'Camion' },
    { value: 'EQUIPEMENT_SPECIAL', label: 'Équipement spécial' },
    { value: 'ENGIN_TP',           label: 'Engin TP' },
  ];

  carburants = [
    { value: 'DIESEL',    label: 'Diesel' },
    { value: 'ESSENCE',   label: 'Essence' },
    { value: 'ELECTRIQUE',label: 'Électrique' },
    { value: 'HYBRIDE',   label: 'Hybride' },
    { value: 'GPL',       label: 'GPL' },
  ];

  statuts = [
    { value: 'DISPONIBLE',                    label: 'Disponible' },
    { value: 'EN_CIRCULATION',                label: 'En circulation' },
    { value: 'EN_MAINTENANCE',                label: 'En maintenance' },
    { value: 'EN_ATTENTE_REPARATION_EXTERNE', label: 'Att. réparation ext.' },
    { value: 'EN_ATTENTE_PIECES',             label: 'Att. pièces' },
    { value: 'IMMOBILISE',                    label: 'Immobilisé' },
    { value: 'ACCIDENTE',                     label: 'Accidenté' },
    { value: 'HORS_SERVICE',                  label: 'Hors service' },
  ];

  ngOnInit() {
    this.svc.getEntites().subscribe(e => this.entites.set(e));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nouveau') {
      this.isEdit = true;
      this.vehiculeId = Number(id);
      this.svc.getOne(this.vehiculeId).subscribe({
        next: (v) => this.form.patchValue({
          ...v,
          dateAcquisition: v.dateAcquisition ? v.dateAcquisition.substring(0, 10) : '',
          carburant: v.carburant ?? '',
        }),
        error: () => this.router.navigate(['/vehicules']),
      });
    }
  }

  touched(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erreurServeur.set('');

    const data = this.form.value as any;
    if (!data.carburant) delete data.carburant;
    if (!data.dateAcquisition) delete data.dateAcquisition;
    if (!data.annee) delete data.annee;

    const op = this.isEdit
      ? this.svc.update(this.vehiculeId!, data)
      : this.svc.create(data);

    op.subscribe({
      next: (v) => this.router.navigate(['/vehicules', (v as any).id]),
      error: (err) => {
        this.erreurServeur.set(err?.error?.message ?? 'Erreur lors de l\'enregistrement.');
        this.loading.set(false);
      },
    });
  }
}
