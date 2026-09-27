// @ts-check
import { createStore } from './lib/storage.js';
import { startApp } from './ui/app.js';

startApp(createStore());
