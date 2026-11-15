import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Rend le message d'erreur de l'API affichable tel quel :
 * la validation renvoie une liste de messages, on les joint en une phrase.
 */
function messageLisible(err: HttpErrorResponse): HttpErrorResponse {
  if (err.status === 0) {
    return new HttpErrorResponse({ ...err, url: err.url ?? undefined, error: { message: 'Serveur injoignable. Vérifiez votre connexion.' } });
  }
  const corps = err.error;
  if (corps && Array.isArray(corps.message)) {
    return new HttpErrorResponse({ ...err, url: err.url ?? undefined, error: { ...corps, message: corps.message.join(' · ') } });
  }
  return err;
}

// Partagé entre toutes les instances de l'intercepteur
let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => messageLisible(err));
      }

      if (isRefreshing) {
        // Un refresh est déjà en cours : attendre son résultat
        return refreshDone$.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(newToken =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))
          )
        );
      }

      // Premier 401 : lancer le refresh
      isRefreshing = true;
      refreshDone$.next(null);

      return auth.refreshToken().pipe(
        switchMap(() => {
          isRefreshing = false;
          const newToken = auth.getToken()!;
          refreshDone$.next(newToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          refreshDone$.next(null);
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
