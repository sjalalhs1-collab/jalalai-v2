import {browserAutomate} from './browser-automation.js';
import type {Tool} from './registry.js';
export function createProductionTools():Tool[]{return [{id:'browser.automate',description:'Optional Playwright browser automation for public web pages with explicit web permission.',permission:'web',execute:browserAutomate}]}
