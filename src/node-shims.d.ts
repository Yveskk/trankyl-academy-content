// Seule API Node utilisee cote serveur (hooks.server.ts) : evite d'ajouter @types/node en dependance.
declare module "node:async_hooks" {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, callback: () => R): R;
    getStore(): T | undefined;
  }
}
