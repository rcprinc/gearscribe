import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SessionService } from '../session.service';
import { JobSidebarPreferencesService } from '../job-sidebar-preferences.service';

export const FFXI_JOBS = [
  'WAR', 'MNK', 'WHM', 'BLM', 'THF', 'PLD', 'DRK', 'BST',
  'BRD', 'RNG', 'SAM', 'NIN', 'DRG', 'SMN', 'BLU', 'COR', 'PUP',
] as const;

const HIDDEN_SECTION_KEY = '__hidden__';

export interface JobAddEvent {
  job: string;
}

export interface JobItemEvent {
  job: string;
  name: string;
}

@Component({
  selector: 'app-job-sidebar',
  templateUrl: './job-sidebar.component.html',
  styleUrls: ['./job-sidebar.component.scss']
})
export class JobSidebarComponent implements OnInit {
  jobs = FFXI_JOBS;
  jobLevels: Record<string, number> = {};

  @Input() items: Record<string, string[]> = {};
  @Input() addLabel = '+ Add';
  @Input() jobSelectable = false;
  @Output() addClicked = new EventEmitter<JobAddEvent>();
  @Output() itemClicked = new EventEmitter<JobItemEvent>();
  @Output() jobClicked = new EventEmitter<JobAddEvent>();

  constructor(
    private sessionService: SessionService,
    private preferencesService: JobSidebarPreferencesService,
  ) {}

  ngOnInit(): void {
    this.sessionService.session$.subscribe((session) => {
      this.jobLevels = session.jobs;
    });
  }

  sortedJobs(): string[] {
    return [...this.jobs].sort(
      (a, b) => this.levelFor(b) - this.levelFor(a) || a.localeCompare(b)
    );
  }

  visibleJobs(): string[] {
    return this.sortedJobs().filter((job) => !this.preferencesService.isHidden(job));
  }

  hiddenJobsList(): string[] {
    return this.sortedJobs().filter((job) => this.preferencesService.isHidden(job));
  }

  levelFor(job: string): number {
    return this.jobLevels[job] ?? 0;
  }

  isExpanded(job: string): boolean {
    return this.preferencesService.isExpanded(job);
  }

  itemsFor(job: string): string[] {
    return this.items[job] ?? [];
  }

  toggle(job: string): void {
    this.preferencesService.toggleExpanded(job);
  }

  isHiddenSectionExpanded(): boolean {
    return this.preferencesService.isExpanded(HIDDEN_SECTION_KEY);
  }

  toggleHiddenSection(): void {
    this.preferencesService.toggleExpanded(HIDDEN_SECTION_KEY);
  }

  hideJob(job: string, event: Event): void {
    event.stopPropagation();
    this.preferencesService.hideJob(job);
  }

  showJob(job: string): void {
    this.preferencesService.showJob(job);
  }

  onAdd(job: string): void {
    this.addClicked.emit({ job });
  }

  onJobNameClick(job: string, event: Event): void {
    if (!this.jobSelectable) {
      return;
    }
    event.stopPropagation();
    this.jobClicked.emit({ job });
  }

  onItemClick(job: string, name: string): void {
    this.itemClicked.emit({ job, name });
  }
}
