import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { ChatPanelComponent } from './features/kanban/components/chat-panel/chat-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmPopupModule, ToastModule, ChatPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  chatOpen = false;
};