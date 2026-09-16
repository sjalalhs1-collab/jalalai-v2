export class ToolRegistry {
    tools = new Map();
    register(t) { this.tools.set(t.id, t); return this; }
    get(id) { return this.tools.get(id); }
    list() { return [...this.tools.values()]; }
}
