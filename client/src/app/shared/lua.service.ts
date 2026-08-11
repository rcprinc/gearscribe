import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LuaStateEntry {
  equipmentSet: string | null;
  lua: string;
}

export interface LuaGeneralSection {
  idle: LuaStateEntry;
  engaged: LuaStateEntry;
  resting: LuaStateEntry;
  weaponSkill: LuaStateEntry;
}

export interface LuaElementStateSection {
  general: LuaStateEntry;
  fire: LuaStateEntry;
  earth: LuaStateEntry;
  water: LuaStateEntry;
  wind: LuaStateEntry;
  ice: LuaStateEntry;
  light: LuaStateEntry;
  dark: LuaStateEntry;
}

export interface LuaElementSection {
  precast: LuaElementStateSection;
  midcast: LuaElementStateSection;
}

export interface LuaMacroBookEntry {
  book: string;
  set: string;
}

export interface LuaJobAbilityEntry {
  abilityName: string;
  equipmentSet: string | null;
  lua: string;
}

export interface LuaSpellEntry {
  spellName: string;
  equipmentSet: string | null;
  lua: string;
}

export interface LuaPetEntry {
  abilityName: string;
  equipmentSet: string | null;
  lua: string;
}

export interface LuaSections {
  general: LuaGeneralSection;
  macroBook?: LuaMacroBookEntry | null;
  element?: LuaElementSection | null;
  jobAbilities?: LuaJobAbilityEntry[] | null;
  spells?: LuaSpellEntry[] | null;
  petAbilities?: LuaPetEntry[] | null;
}

export interface LuaDocument {
  job: string;
  subjob: string | null;
  sections: LuaSections;
}

export function emptyLuaStateEntry(): LuaStateEntry {
  return { equipmentSet: null, lua: '' };
}

@Injectable({
  providedIn: 'root'
})
export class LuaService {
  private readonly baseUrl = '/api/luas';

  constructor(private http: HttpClient) { }

  get(job: string, subjob: string | null): Observable<LuaDocument> {
    const url = subjob
      ? `${this.baseUrl}/${encodeURIComponent(job)}/${encodeURIComponent(subjob)}`
      : `${this.baseUrl}/${encodeURIComponent(job)}`;
    return this.http.get<LuaDocument>(url);
  }

  listSubjobs(job: string): Observable<LuaDocument[]> {
    return this.http.get<LuaDocument[]>(`${this.baseUrl}/${encodeURIComponent(job)}/subjobs`);
  }

  listAllSubjobs(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.baseUrl}/subjobs`);
  }

  save(doc: LuaDocument): Observable<void> {
    return this.http.post<void>(this.baseUrl, doc);
  }

  updateFile(job: string, content: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/update-file`, { job, content });
  }
}
