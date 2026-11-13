import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InspectionsService } from '../../../core/services/inspections.service';
import { Inspection } from '../../../core/models/inspection.model';

@Component({
  selector: 'app-inspection-detail',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './inspection-detail.component.html',
})
export class InspectionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(InspectionsService);

  inspection = signal<Inspection | null>(null);
  loading = signal(true);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.getOne(id).subscribe({
      next: (i) => { this.inspection.set(i); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  countResultat(r: string): number {
    return this.inspection()?.items?.filter(i => i.resultat === r).length ?? 0;
  }

  typeLabel(t: string) {
    const m: Record<string, string> = {
      PRE_DEPART: 'Pré-départ', PERIODIQUE: 'Périodique',
      RETOUR_MISSION: 'Retour mission', TECHNIQUE: 'Technique',
    };
    return m[t] ?? t;
  }

  statutLabel(s: string) {
    const m: Record<string, string> = { CONFORME: 'Conforme', NON_CONFORME: 'Non conforme', PARTIEL: 'Partiel' };
    return m[s] ?? s;
  }

  statutClass(s: string) {
    const m: Record<string, string> = {
      CONFORME: 'bg-green-100 text-green-700',
      NON_CONFORME: 'bg-red-100 text-red-700',
      PARTIEL: 'bg-orange-100 text-orange-700',
    };
    return m[s] ?? 'bg-gray-100 text-gray-600';
  }
}
