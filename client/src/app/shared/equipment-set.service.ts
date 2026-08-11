import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GearSlot {
  key: string;
  label: string;
}

export const GEAR_SLOTS: GearSlot[] = [
  { key: 'main', label: 'Main' },
  { key: 'sub', label: 'Sub' },
  { key: 'ranged', label: 'Ranged' },
  { key: 'ammo', label: 'Ammo' },
  { key: 'head', label: 'Head' },
  { key: 'neck', label: 'Neck' },
  { key: 'ear1', label: 'Ear 1' },
  { key: 'ear2', label: 'Ear 2' },
  { key: 'body', label: 'Body' },
  { key: 'hands', label: 'Hands' },
  { key: 'ring1', label: 'Ring 1' },
  { key: 'ring2', label: 'Ring 2' },
  { key: 'back', label: 'Back' },
  { key: 'waist', label: 'Waist' },
  { key: 'legs', label: 'Legs' },
  { key: 'feet', label: 'Feet' },
];

export interface EquipmentSet {
  job: string;
  name: string;
  gear: Record<string, string | null>;
  shortNames?: Record<string, string | null>;
}

// The weapon type each job is most likely to main-hand, used to pre-select
// the Main slot's weapon type filter.
export const DEFAULT_WEAPON_TYPE_BY_JOB: Record<string, string> = {
  WAR: 'Great Axe',
  MNK: 'Hand-to-Hand',
  WHM: 'Staff',
  BLM: 'Staff',
  THF: 'Dagger',
  PLD: 'Sword',
  DRK: 'Scythe',
  BST: 'Axe',
  BRD: 'Staff',
  RNG: 'Staff',
  SAM: 'Great Katana',
  NIN: 'Katana',
  DRG: 'Polearm',
  SMN: 'Staff',
  BLU: 'Sword',
  COR: 'Staff',
  PUP: 'Hand-to-Hand',
};

export function emptyGear(): Record<string, string | null> {
  const gear: Record<string, string | null> = {};
  for (const slot of GEAR_SLOTS) {
    gear[slot.key] = null;
  }
  return gear;
}

@Injectable({
  providedIn: 'root'
})
export class EquipmentSetService {
  private readonly baseUrl = '/api/equipment-sets';

  constructor(private http: HttpClient) { }

  list(): Observable<EquipmentSet[]> {
    return this.http.get<EquipmentSet[]>(this.baseUrl);
  }

  get(job: string, name: string): Observable<EquipmentSet> {
    return this.http.get<EquipmentSet>(
      `${this.baseUrl}/${encodeURIComponent(job)}/${encodeURIComponent(name)}`
    );
  }

  save(set: EquipmentSet, originalName: string | null): Observable<void> {
    return this.http.post<void>(this.baseUrl, { ...set, originalName });
  }

  delete(job: string, name: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${encodeURIComponent(job)}/${encodeURIComponent(name)}`
    );
  }
}
