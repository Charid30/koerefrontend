import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StocksService } from '../../../core/services/stocks.service';

@Component({
  selector: 'app-piece-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './piece-form.component.html',
})
export class PieceFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private svc = inject(StocksService);

  loading = signal(false);
  erreurServeur = signal('');

  form = this.fb.group({
    reference: ['', Validators.required],
    designation: ['', Validators.required],
    marque: [''],
    categorie: [''],
    quantiteDisponible: [0],
    quantiteMinimum: [0],
    unite: ['unité'],
    prixUnitaire: [null as number | null],
    emplacement: [''],
  });

  soumettre() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.svc.createPiece(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/stocks']),
      error: (err) => {
        this.erreurServeur.set(err?.error?.message ?? 'Erreur lors de la création.');
        this.loading.set(false);
      },
    });
  }
}
