import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
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

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Requête qui porte déjà son propre jeton (renouvellement) : on n'y touche pas
  if (req.headers.has('Authorization')) return next(req);

  const token = auth.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/') || !token) {
        return throwError(() => messageLisible(err));
      }

      // Jeton d'accès expiré : on le renouvelle puis on rejoue la requête
      return auth.renouveler(token).pipe(
        catchError((refreshErr: HttpErrorResponse) => {
          // Déconnexion seulement si l'API refuse vraiment la session.
          // Coupure réseau, serveur en redémarrage… : on reste connecté.
          if (refreshErr?.status === 401 || refreshErr?.status === 403) auth.logout();
          return throwError(() => messageLisible(refreshErr));
        }),
        switchMap((nouveau) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${nouveau}` } })).pipe(
            catchError((e: HttpErrorResponse) => throwError(() => messageLisible(e))),
          ),
        ),
      );
    }),
  );
};
