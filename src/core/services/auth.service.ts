import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, firstValueFrom } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, User, Role } from '../models/user.model';
import { Action, autorise } from '../auth/permissions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'koere_access_token';
  private readonly REFRESH_KEY = 'koere_refresh_token';
  private readonly USER_KEY = 'koere_user';

  private _user = signal<User | null>(this.getUserFromStorage());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly role = computed(() => this._user()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  /** L'utilisateur connecté a-t-il le droit de faire cette action (règles de l'API) ? */
  peut(action: Action): boolean {
    return autorise(this.role() as Role | null, action);
  }

  login(email: string, motDePasse: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, motDePasse }).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.accessToken);
        localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this._user.set(res.user as User);
      })
    );
  }

  logout() {
    // Plusieurs requêtes en échec peuvent demander la déconnexion en même temps
    if (localStorage.getItem(this.TOKEN_KEY)) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /** Renouvellement en cours dans cet onglet (partagé par toutes les requêtes en 401) */
  private renouvellement$: Observable<string> | null = null;

  /**
   * Obtient un jeton d'accès valide après un 401.
   * - Si un autre onglet (ou une autre requête) a déjà renouvelé, on réutilise son jeton.
   * - Les onglets se relaient via un verrou du navigateur : jamais deux renouvellements
   *   en même temps avec le même refresh token (le second serait refusé par l'API).
   */
  renouveler(jetonUtilise: string | null): Observable<string> {
    const actuel = this.getToken();
    if (actuel && actuel !== jetonUtilise) return of(actuel);
    if (!this.renouvellement$) {
      this.renouvellement$ = from(this.avecVerrou(() => this.appelerRefresh(jetonUtilise))).pipe(
        finalize(() => (this.renouvellement$ = null)),
        shareReplay(1),
      );
    }
    return this.renouvellement$;
  }

  private async appelerRefresh(jetonUtilise: string | null): Promise<string> {
    // Un autre onglet a pu renouveler pendant qu'on attendait le verrou
    const actuel = this.getToken();
    if (actuel && actuel !== jetonUtilise) return actuel;
    const refresh = localStorage.getItem(this.REFRESH_KEY);
    if (!refresh) throw new HttpErrorResponse({ status: 401, error: { message: 'Session expirée' } });
    const res = await firstValueFrom(
      this.http.post<{ accessToken: string; refreshToken: string }>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refresh}` } },
      ),
    );
    localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
    return res.accessToken;
  }

  private avecVerrou<T>(fn: () => Promise<T>): Promise<T> {
    const locks = (navigator as any).locks;
    return locks?.request ? locks.request('sofary-renouvellement', fn) : fn();
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(...roles: Role[]): boolean {
    const r = this.role();
    return r ? roles.includes(r) : false;
  }

  private getUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }
}
