import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SetupStatus {
  completed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SetupStatusService {
  private readonly baseUrl = '/api/settings/setup-status';

  constructor(private http: HttpClient) { }

  get(): Observable<SetupStatus> {
    return this.http.get<SetupStatus>(this.baseUrl);
  }

  markComplete(): Observable<void> {
    return this.http.post<void>(this.baseUrl, {});
  }
}
