import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GearItem {
  name: string;
  level: number;
  jobs: string[];
  allJobs: boolean;
  stats: string;
  notes: string;
  weaponType: string | null;
}

// Matches the server's normalization (server/InventoryEndpoints.cs) so gear
// item names can be compared against inventory item names regardless of
// casing/spacing/punctuation differences (e.g. "Warrior's Belt" vs "warriors_belt").
export function normalizeItemKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

@Injectable({
  providedIn: 'root'
})
export class GearService {
  constructor(private http: HttpClient) { }

  getGearForSlot(slot: string, job: string | null): Observable<GearItem[]> {
    let params = new HttpParams();
    if (job) {
      params = params.set('job', job);
    }
    return this.http.get<GearItem[]>(`/api/gear/${encodeURIComponent(slot)}`, { params });
  }

  getStatFilterOptions(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>('/api/stat-filters');
  }

  getOwnedItemKeys(): Observable<string[]> {
    return this.http.get<string[]>('/api/settings/inventory/items');
  }
}
