import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OtService } from '../../../core/services/ot.service';
import { OrdreTravail } from '../../../core/models/ot.model';
import { OT_STATUT_LABELS, OT_STATUT_CLASSES, OT_TRANSITIONS } from '../ot.constants';

@Component({
  selector: 'app-ot-detail',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './ot-detail.component.html',
})
export class OtDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(OtService);

  ot = signal<OrdreTravail | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  erreurAction = signal('');

  transitionsDisponibles = computed(() => {
    const statut = this.ot()?.statut;
    return statut ? (OT_TRANSITIONS[statut] ?? []) : [];
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.charger(id);
  }

  private charger(id: number) {
    this.svc.getOne(id).subscribe({
      next: (ot) => { this.ot.set(ot); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  changerStatut(statut: string) {
    if (!this.ot()) return;
    this.actionLoading.set(true);
    this.erreurAction.set('');
    this.svc.updateStatut(this.ot()!.id, statut).subscribe({
      next: (ot) => { this.ot.set(ot); this.actionLoading.set(false); },
      error: (err) => {
        this.erreurAction.set(err?.error?.message ?? 'Impossible de changer le statut.');
        this.actionLoading.set(false);
      },
    });
  }

  transitionClass(statut: string): string {
    const dangereux = ['ANNULE'];
    const positif = ['CLOTURE', 'TERMINE'];
    if (dangereux.includes(statut)) return 'border-red-200 text-red-700 hover:bg-red-50';
    if (positif.includes(statut)) return 'border-green-200 text-green-700 hover:bg-green-50';
    return 'border-primary-200 text-primary-700 hover:bg-primary-50';
  }

  statutLabel(s: string) { return OT_STATUT_LABELS[s] ?? s; }
  statutClass(s: string) { return OT_STATUT_CLASSES[s] ?? 'bg-gray-100 text-gray-600'; }
}
