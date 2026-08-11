import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuthSettings {
  username: string;
  bearerToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthSettingsService {
  private readonly baseUrl = '/api/settings/auth';

  constructor(private http: HttpClient) { }

  get(): Observable<AuthSettings> {
    return this.http.get<AuthSettings>(this.baseUrl);
  }

  save(settings: AuthSettings): Observable<void> {
    return this.http.post<void>(this.baseUrl, settings);
  }
}
