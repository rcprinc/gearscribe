import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MacroLine {
  text: string;
  wait: string;
}

export interface Macro {
  job: string;
  name: string;
  lines: MacroLine[];
}

export function defaultMacroLines(): MacroLine[] {
  return [1, 2, 3, 4, 5].map(() => ({ text: '', wait: '' }));
}

@Injectable({
  providedIn: 'root'
})
export class MacroService {
  private readonly baseUrl = '/api/macros';

  constructor(private http: HttpClient) { }

  list(): Observable<Macro[]> {
    return this.http.get<Macro[]>(this.baseUrl);
  }

  get(job: string, name: string): Observable<Macro> {
    return this.http.get<Macro>(
      `${this.baseUrl}/${encodeURIComponent(job)}/${encodeURIComponent(name)}`
    );
  }

  save(macro: Macro, originalName: string | null): Observable<void> {
    return this.http.post<void>(this.baseUrl, { ...macro, originalName });
  }

  delete(job: string, name: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${encodeURIComponent(job)}/${encodeURIComponent(name)}`
    );
  }
}
