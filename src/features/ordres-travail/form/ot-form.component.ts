import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OtService } from '../../../core/services/ot.service';
import { VehiculesService } from '../../../core/services/vehicules.service';
import { Vehicule } from '../../../core/models/vehicule.model';

@Component({
  selector: 'app-ot-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ot-form.component.html',
})
export class OtFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private svc = inject(OtService);
  private vehiculesSvc = inject(VehiculesService);

  loading = signal(false);
  erreurServeur = signal('');
  vehicules = signal<Vehicule[]>([]);

  form = this.fb.group({
    vehiculeId:        ['', Validators.required],
    typeMaintenance:   ['CORRECTIVE', Validators.required],
    datePlanifiee:     [''],
    prestatireExterne: [''],
    description:       [''],
  });

  ngOnInit() {
    this.vehiculesSvc.getAll({ limit: 100 }).subscribe({
      next: (r) => this.vehicules.set(r.data),
    });
  }

  soumettre() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.erreurServeur.set('');
    const val = this.form.value as any;
    const payload = {
      ...val,
      vehiculeId: Number(val.vehiculeId),
      datePlanifiee: val.datePlanifiee || undefined,
      prestatireExterne: val.prestatireExterne || undefined,
    };
    this.svc.create(payload).subscribe({
      next: (ot) => this.router.navigate(['/ordres-travail', ot.id]),
      error: (err) => {
        this.erreurServeur.set(err?.error?.message ?? 'Erreur lors de la création.');
        this.loading.set(false);
      },
    });
  }
}
