/**
 * Suivi des actions en cours, une cle par action (ex. "save", "delete:12"),
 * pour afficher un indicateur de chargement sur le bon bouton et empecher les
 * doubles clics.
 *
 *   const pending = new Pending();
 *   await pending.run("save", async () => { ... });
 *   <Btn loading={pending.is("save")}>Enregistrer</Btn>
 */
export class Pending {
  #counts = $state<Record<string, number>>({});

  is(key: string): boolean {
    return (this.#counts[key] ?? 0) > 0;
  }

  /** Vrai si une action (n'importe laquelle) est en cours. */
  get any(): boolean {
    return Object.values(this.#counts).some((n) => n > 0);
  }

  async run<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
    if (this.is(key)) return undefined; // deja en cours : on ignore le double clic
    this.#counts[key] = (this.#counts[key] ?? 0) + 1;
    try {
      return await fn();
    } finally {
      this.#counts[key] -= 1;
    }
  }
}
