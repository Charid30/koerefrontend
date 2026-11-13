import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardData } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './tableau-de-bord.component.html',
})
export class TableauDeBordComponent implements OnInit {
  private auth = inject(AuthService);
  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal(false);
  readonly today = new Date();

  readonly role = this.auth.role;
  readonly isDirection  = computed(() => this.role() === 'DIRECTION');
  readonly isAdmin      = computed(() => this.role() === 'ADMIN');
  readonly isMecanicien = computed(() => this.role() === 'MECANICIEN');
  readonly isChauffeur  = computed(() => this.role() === 'CHAUFFEUR');

  readonly maintenancesUrgentes = computed(() => {
    const d = this.data();
    if (!d?.prochainesMaintenances) return [];
    const dans14j = new Date();
    dans14j.setDate(dans14j.getDate() + 14);
    return d.prochainesMaintenances.filter(m =>
      m.prochaineExecutionDate && new Date(m.prochaineExecutionDate) <= dans14j
    );
  });

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.dashboardService.getData().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE_VALIDATION: 'Validation',
      PLANIFIE: 'Planifié',
      EN_COURS: 'En cours',
      EN_ATTENTE_PIECES: 'Att. pièces',
      EN_ATTENTE_PRESTATAIRE: 'Att. prest.',
      TERMINE: 'Terminé',
      CONTROLE: 'Contrôle',
      CLOTURE: 'Clôturé',
      ANNULE: 'Annulé',
    };
    return labels[statut] ?? statut;
  }

  statutClass(statut: string): string {
    const classes: Record<string, string> = {
      EN_ATTENTE_VALIDATION: 'bg-yellow-100 text-yellow-800',
      PLANIFIE: 'bg-blue-100 text-blue-800',
      EN_COURS: 'bg-indigo-100 text-indigo-800',
      EN_ATTENTE_PIECES: 'bg-orange-100 text-orange-800',
      EN_ATTENTE_PRESTATAIRE: 'bg-orange-100 text-orange-800',
      TERMINE: 'bg-green-100 text-green-800',
      CONTROLE: 'bg-purple-100 text-purple-800',
      CLOTURE: 'bg-gray-100 text-gray-600',
      ANNULE: 'bg-red-100 text-red-700',
    };
    return classes[statut] ?? 'bg-gray-100 text-gray-600';
  }
}
