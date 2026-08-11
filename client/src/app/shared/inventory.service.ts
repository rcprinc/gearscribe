import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private http: HttpClient) { }

  save(raw: string): Observable<void> {
    return this.http.post<void>('/api/settings/inventory', { raw });
  }
}
