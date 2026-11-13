import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(1)]],
  });

  submit() {
    if (this.form.invalid || this.loading()) return;

    this.error.set(null);
    this.loading.set(true);

    const { email, motDePasse } = this.form.value;

    this.auth.login(email!, motDePasse!).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(
          err.status === 0
            ? 'Serveur injoignable. Vérifiez que l’API est démarrée.'
            : (err.error?.message ?? 'Identifiants invalides'),
        );
        this.loading.set(false);
      },
    });
  }

  get emailCtrl() {
    return this.form.controls.email;
  }
  get mdpCtrl() {
    return this.form.controls.motDePasse;
  }
}
