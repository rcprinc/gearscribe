import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface CharacterSession {
  signedIn: boolean;
  authStatus: 'ok' | 'error';
  name: string | null;
  jobs: Record<string, number>;
}

const EMPTY_SESSION: CharacterSession = {
  signedIn: false,
  authStatus: 'ok',
  name: null,
  jobs: {},
};

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly sessionSubject = new BehaviorSubject<CharacterSession>(EMPTY_SESSION);
  readonly session$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  get current(): CharacterSession {
    return this.sessionSubject.value;
  }

  load(): void {
    this.http.get<CharacterSession>('/api/settings/session').subscribe((session) => {
      this.sessionSubject.next(session);
    });
  }

  loginWithResponse(raw: string): Observable<CharacterSession> {
    const parsed = JSON.parse(raw);
    const session: CharacterSession = {
      signedIn: true,
      authStatus: 'ok',
      name: parsed.name ?? null,
      jobs: parsed.jobs ?? {},
    };

    return this.http.post<void>('/api/settings/session', session).pipe(
      tap(() => this.sessionSubject.next(session)),
      map(() => session),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/settings/logout', {}).pipe(
      tap(() => this.sessionSubject.next(EMPTY_SESSION)),
    );
  }

  markAuthFailed(): void {
    const updated: CharacterSession = { ...this.current, authStatus: 'error' };
    this.sessionSubject.next(updated);
    this.http.post('/api/settings/session', updated).subscribe();
  }
}
