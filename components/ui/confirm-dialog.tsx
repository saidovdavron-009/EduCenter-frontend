"use client";
import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ message: string; options?: ConfirmOptions } | null>(null);
  const resolveRef = React.useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = React.useCallback<ConfirmFn>((message, options) => {
    setState({ message, options });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = undefined;
  };

  const variant = state?.options?.variant ?? "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onOpenChange={(open) => !open && handleClose(false)} size="sm">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div
              className={
                variant === "destructive"
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--foreground)]"
              }
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <ModalTitle>{state?.options?.title ?? "Tasdiqlash"}</ModalTitle>
          </div>
        </ModalHeader>
        <div className="px-6 pt-4 text-sm text-[var(--muted-foreground)]">
          {state?.options?.description ?? state?.message}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {state?.options?.cancelText ?? "Bekor qilish"}
          </Button>
          <Button variant={variant === "destructive" ? "destructive" : "default"} onClick={() => handleClose(true)}>
            {state?.options?.confirmText ?? "Ha, tasdiqlayman"}
          </Button>
        </ModalFooter>
      </Modal>
    </ConfirmContext.Provider>
  );
}