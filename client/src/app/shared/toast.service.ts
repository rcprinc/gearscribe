import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly messageSubject = new Subject<string>();
  readonly message$ = this.messageSubject.asObservable();

  show(message: string): void {
    this.messageSubject.next(message);
  }
}
