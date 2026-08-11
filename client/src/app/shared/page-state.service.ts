import { Injectable } from '@angular/core';

export interface PageSelection {
  job: string | null;
  name: string | null;
}

const EMPTY_SELECTION: PageSelection = { job: null, name: null };

@Injectable({
  providedIn: 'root'
})
export class PageStateService {
  private state: Record<string, PageSelection> = {};

  get(page: string): PageSelection {
    return this.state[page] ?? EMPTY_SELECTION;
  }

  set(page: string, selection: PageSelection): void {
    this.state[page] = selection;
  }

  clear(page: string): void {
    this.state[page] = EMPTY_SELECTION;
  }

  clearAll(): void {
    this.state = {};
  }
}
