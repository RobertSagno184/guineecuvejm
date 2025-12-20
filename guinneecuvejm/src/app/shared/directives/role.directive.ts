import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthState } from '../../core/services/auth/auth.state';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class RoleDirective {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly authState = inject(AuthState);

  private currentRole: string | null = null;

  @Input('hasRole')
  set requiredRole(role: string | null) {
    this.currentRole = role;
    this.updateView();
  }

  private updateView(): void {
    const userRole = this.authState.role();
    if (!this.currentRole || userRole === this.currentRole) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }
}


