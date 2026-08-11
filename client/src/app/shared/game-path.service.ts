import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GamePathSettings {
  path: string;
}

@Injectable({
  providedIn: 'root'
})
export class GamePathService {
  private readonly baseUrl = '/api/settings/game-path';

  constructor(private http: HttpClient) { }

  get(): Observable<GamePathSettings> {
    return this.http.get<GamePathSettings>(this.baseUrl);
  }

  save(path: string): Observable<void> {
    return this.http.post<void>(this.baseUrl, { path });
  }
}
