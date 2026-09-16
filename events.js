export class EventBus {
    listeners = new Set();
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(e) { for (const fn of this.listeners)
        fn(e); }
}
