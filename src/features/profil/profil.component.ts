import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';

function confirmerMdp(ctrl: AbstractControl): ValidationErrors | null {
  const mdp = ctrl.get('nouveauMotDePasse')?.value;
  const confirm = ctrl.get('confirmerMotDePasse')?.value;
  return mdp && confirm && mdp !== confirm ? { nonConforme: true } : null;
}

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, NgClass, ReactiveFormsModule],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  private auth = inject(AuthService);
  private svc  = inject(UsersService);
  private fb   = inject(FormBuilder);

  user = this.auth.user;

  loading  = signal(false);
  succes   = signal('');
  erreur   = signal('');
  afficherMdp = signal(false);

  form = this.fb.group({
    motDePasseActuel:   ['', Validators.required],
    nouveauMotDePasse:  ['', [Validators.required, Validators.minLength(8)]],
    confirmerMotDePasse:['', Validators.required],
  }, { validators: confirmerMdp });

  ngOnInit() {}

  changerMotDePasse() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.succes.set('');
    this.erreur.set('');
    const val = this.form.value;
    this.svc.changerMotDePasse(val.motDePasseActuel!, val.nouveauMotDePasse!).subscribe({
      next: () => {
        this.succes.set('Mot de passe modifié avec succès.');
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
      RESPONSABLE_PARC: 'Responsable Parc',
      RESPONSABLE_MAINTENANCE: 'Responsable Maintenance',
      MECANICIEN: 'Mécanicien',
      CHAUFFEUR: 'Chauffeur',
      DIRECTION: 'Logistique',
    };
    return m[role] ?? role;
  }

  roleColor(role: string): string {
    const m: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-700',
      RESPONSABLE_PARC: 'bg-blue-100 text-blue-700',
      RESPONSABLE_MAINTENANCE: 'bg-indigo-100 text-indigo-700',
      MECANICIEN: 'bg-orange-100 text-orange-700',
      CHAUFFEUR: 'bg-teal-100 text-teal-700',
      DIRECTION: 'bg-purple-100 text-purple-700',
    };
    return m[role] ?? 'bg-gray-100 text-gray-600';
  }
}
