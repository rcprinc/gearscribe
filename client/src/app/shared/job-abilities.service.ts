import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobAbilitiesService {
  private readonly baseUrl = '/api/job-abilities';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(this.baseUrl);
  }
}
