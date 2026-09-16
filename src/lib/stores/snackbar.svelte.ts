export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let nextId = 1;

class SnackbarStore {
  toasts = $state<Toast[]>([]);

  show(message: string, type: Toast["type"] = "info", durationMs = 4000) {
    const id = nextId++;
    this.toasts.push({ id, message, type });
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(message: string) {
    this.show(message, "success");
  }

  error(message: string) {
    this.show(message, "error", 6000);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const snackbar = new SnackbarStore();
