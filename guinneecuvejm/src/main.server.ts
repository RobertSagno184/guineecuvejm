import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Server-side bootstrap function.
 * It MUST accept a BootstrapContext and forward it to bootstrapApplication
 * so that Angular can create the proper platform when running on the server.
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
