import { ToolRegistry } from './registry.js';
import { webOpenTool } from './web.js';
import { browserOpenTool } from './browser.js';
import { calculatorTool } from './calculator.js';
import { codeSandboxTool } from './code.js';
import { timeTool } from './time.js';
export function createBuiltinTools() { return new ToolRegistry().register(webOpenTool).register(browserOpenTool).register(calculatorTool).register(codeSandboxTool).register(timeTool); }
