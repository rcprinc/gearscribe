import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClearAllService {
  private readonly baseUrl = '/api/settings/clear-all';

  constructor(private http: HttpClient) { }

  clearAll(): Observable<void> {
    return this.http.post<void>(this.baseUrl, {});
  }
}
