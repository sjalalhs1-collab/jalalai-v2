import { browserAutomate } from './browser-automation.js';
export function createProductionTools() { return [{ id: 'browser.automate', description: 'Optional Playwright browser automation for public web pages with explicit web permission.', permission: 'web', execute: browserAutomate }]; }
