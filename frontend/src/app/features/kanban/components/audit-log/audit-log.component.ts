import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuditLog } from '../../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, SidebarModule, TableModule, ButtonModule, AvatarModule, TagModule, TooltipModule],
  templateUrl: './audit-log.component.html',
  styles: [`
    :host { display: contents; }
  `]
})
export class AuditLogComponent {
  @Input() logs: AuditLog[] = [];
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  onVisibleChange(value: boolean) {
    this.visible = value;
    this.visibleChange.emit(value);
  }
}
