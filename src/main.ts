import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Demo } from './app/demo';
import { readDemoMode } from './app/demo-mode';

// The same bundle serves the shell page and, inside each iframe, one isolated router panel.
bootstrapApplication(readDemoMode(location.search) ? Demo : App, appConfig).catch((err) =>
  console.error(err),
);
