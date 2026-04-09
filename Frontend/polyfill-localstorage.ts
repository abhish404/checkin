
// This file polyfills localStorage in Node.js environments (like during static rendering)
// where it might be defined but broken (e.g. missing getItem).

if (typeof global !== 'undefined') {
    // Check if localStorage is defined but broken (missing getItem)
    // This can happen in some Node.js versions or environments
    if (
        typeof (global as any).localStorage !== 'undefined' &&
        typeof (global as any).localStorage.getItem !== 'function'
    ) {
        console.warn('Polyfilling broken localStorage in Node environment');

        class InMemoryStorage {
            private storage = new Map<string, string>();

            getItem(key: string): string | null {
                return this.storage.get(key) ?? null;
            }

            setItem(key: string, value: string): void {
                this.storage.set(key, String(value));
            }

            removeItem(key: string): void {
                this.storage.delete(key);
            }

            clear(): void {
                this.storage.clear();
            }

            key(index: number): string | null {
                return Array.from(this.storage.keys())[index] ?? null;
            }

            get length(): number {
                return this.storage.size;
            }
        }

        // Overwrite the broken localStorage
        Object.defineProperty(global, 'localStorage', {
            value: new InMemoryStorage(),
            writable: true,
            configurable: true,
        });
    }
}
