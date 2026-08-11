import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MacrosComponent } from './pages/macros/macros.component';
import { LuasComponent } from './pages/luas/luas.component';
import { EquipmentSetsComponent } from './pages/equipment-sets/equipment-sets.component';
import { SettingsComponent } from './pages/settings/settings.component';

const routes: Routes = [
  { path: '', redirectTo: 'macros', pathMatch: 'full' },
  { path: 'macros', component: MacrosComponent },
  { path: 'luas', component: LuasComponent },
  { path: 'equipment-sets', component: EquipmentSetsComponent },
  { path: 'settings', component: SettingsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
