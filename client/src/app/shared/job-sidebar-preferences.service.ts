import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface JobSidebarPreferences {
  expandedJobs: string[];
  hiddenJobs: string[];
}

const EMPTY_PREFERENCES: JobSidebarPreferences = {
  expandedJobs: [],
  hiddenJobs: [],
};

@Injectable({
  providedIn: 'root'
})
export class JobSidebarPreferencesService {
  private readonly prefsSubject = new BehaviorSubject<JobSidebarPreferences>(EMPTY_PREFERENCES);
  readonly preferences$ = this.prefsSubject.asObservable();

  constructor(private http: HttpClient) {}

  get current(): JobSidebarPreferences {
    return this.prefsSubject.value;
  }

  load(): void {
    this.http.get<JobSidebarPreferences>('/api/settings/preferences').subscribe((prefs) => {
      this.prefsSubject.next(prefs);
    });
  }

  isExpanded(key: string): boolean {
    return this.current.expandedJobs.includes(key);
  }

  toggleExpanded(key: string): void {
    const expanded = new Set(this.current.expandedJobs);
    if (expanded.has(key)) {
      expanded.delete(key);
    } else {
      expanded.add(key);
    }
    this.update({ ...this.current, expandedJobs: Array.from(expanded) });
  }

  isHidden(job: string): boolean {
    return this.current.hiddenJobs.includes(job);
  }

  hideJob(job: string): void {
    const hidden = new Set(this.current.hiddenJobs);
    hidden.add(job);
    const expanded = new Set(this.current.expandedJobs);
    expanded.delete(job);
    this.update({ expandedJobs: Array.from(expanded), hiddenJobs: Array.from(hidden) });
  }

  showJob(job: string): void {
    const hidden = new Set(this.current.hiddenJobs);
    hidden.delete(job);
    this.update({ ...this.current, hiddenJobs: Array.from(hidden) });
  }

  clearAll(): Observable<void> {
    return this.http.post<void>('/api/settings/preferences/clear', {}).pipe(
      tap(() => this.prefsSubject.next(EMPTY_PREFERENCES)),
    );
  }

  private update(prefs: JobSidebarPreferences): void {
    this.prefsSubject.next(prefs);
    this.http.post('/api/settings/preferences', prefs).subscribe();
  }
}
