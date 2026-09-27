// @ts-check
import { createStore } from './lib/storage.js';
import { startApp } from './ui/app.js';
import { installErrorReporter, reportError } from './ui/debug.js';

installErrorReporter();
try {
  startApp(createStore());
} catch (e) {
  reportError(e, 'startApp');
}
