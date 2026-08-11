import { Component, OnInit } from '@angular/core';
import { AuthSettingsService } from '../../shared/auth-settings.service';
import { SessionService } from '../../shared/session.service';
import { ToastService } from '../../shared/toast.service';
import { JobSidebarPreferencesService } from '../../shared/job-sidebar-preferences.service';
import { InventoryService } from '../../shared/inventory.service';
import { GamePathService } from '../../shared/game-path.service';
import { ClearAllService } from '../../shared/clear-all.service';
import { PageStateService } from '../../shared/page-state.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  username = '';
  bearerToken = '';
  gamePath = '';

  session$ = this.sessionService.session$;

  addInventoryModalOpen = false;
  addInventoryRaw = '';

  addProfileModalOpen = false;
  addProfileRaw = '';

  constructor(
    private authSettingsService: AuthSettingsService,
    private sessionService: SessionService,
    private toastService: ToastService,
    private jobSidebarPreferencesService: JobSidebarPreferencesService,
    private inventoryService: InventoryService,
    private gamePathService: GamePathService,
    private clearAllService: ClearAllService,
    private pageStateService: PageStateService,
  ) {}

  ngOnInit(): void {
    this.authSettingsService.get().subscribe((settings) => {
      this.username = settings.username;
      this.bearerToken = settings.bearerToken;
    });

    this.gamePathService.get().subscribe((settings) => {
      this.gamePath = settings.path;
    });
  }

  saveGamePath(): void {
    const path = this.gamePath.trim();
    if (!path) {
      return;
    }

    this.gamePathService.save(path).subscribe(() => {
      this.gamePathService.get().subscribe((settings) => {
        this.gamePath = settings.path;
      });
      this.toastService.show('Game path saved');
    });
  }

  login(): void {
    // Not wired to a real HorizonXI auth endpoint yet — for now this just
    // saves the entered credentials. Use "+ Add Profile Info" to actually
    // sign in with a real character session.
    this.authSettingsService
      .save({ username: this.username, bearerToken: this.bearerToken })
      .subscribe(() => {
        this.toastService.show('Saved');
      });
  }

  logout(): void {
    this.sessionService.logout().subscribe(() => {
      this.username = '';
      this.bearerToken = '';
      this.toastService.show('Signed out');
    });
  }

  openAddInventoryModal(): void {
    this.addInventoryModalOpen = true;
    this.addInventoryRaw = '';
  }

  closeAddInventoryModal(): void {
    this.addInventoryModalOpen = false;
  }

  saveInventory(): void {
    const raw = this.addInventoryRaw.trim();
    if (!raw) {
      return;
    }

    this.inventoryService.save(raw).subscribe({
      next: () => {
        this.toastService.show('Inventory saved');
        this.closeAddInventoryModal();
      },
      error: () => {
        this.toastService.show("That doesn't look like valid JSON");
      },
    });
  }

  openAddProfileModal(): void {
    this.addProfileModalOpen = true;
    this.addProfileRaw = '';
  }

  closeAddProfileModal(): void {
    this.addProfileModalOpen = false;
  }

  saveProfile(): void {
    const raw = this.addProfileRaw.trim();
    if (!raw) {
      return;
    }

    try {
      this.sessionService.loginWithResponse(raw).subscribe(() => {
        this.toastService.show('Profile saved');
        this.closeAddProfileModal();
      });
    } catch {
      this.toastService.show("That doesn't look like valid JSON");
    }
  }

  clearEverything(): void {
    if (!window.confirm(
      'Clear EVERYTHING? This deletes all saved Macros, Equipment Sets, and Luas, signs you out, ' +
      'and resets your game path, inventory, and job filters/hidden state. This cannot be undone.'
    )) {
      return;
    }

    this.clearAllService.clearAll().subscribe(() => {
      this.sessionService.logout().subscribe(() => {
        this.username = '';
        this.bearerToken = '';
        this.gamePath = '';
        this.pageStateService.clearAll();
        this.jobSidebarPreferencesService.clearAll().subscribe(() => {
          this.toastService.show('Everything cleared');
        });
      });
    });
  }
}
