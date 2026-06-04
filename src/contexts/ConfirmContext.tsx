import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = (newOptions: ConfirmOptions) => {
    setOptions(newOptions);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      await options.onConfirm();
    }
    setOpen(false);
  };

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    setOpen(false);
  };

  // Prevent default overlay click behavior so it requires explicit cancel/confirm
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleCancel();
    } else {
      setOpen(true);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="bg-charcoal border-primary-foreground/[0.08] sm:max-w-[320px] w-[calc(100vw-2rem)] rounded-2xl p-4 sm:p-4 shadow-2xl gap-3">
          <AlertDialogHeader className="space-y-1.5 text-left sm:text-left">
            <AlertDialogTitle className="font-heading text-[16px] font-semibold text-primary-foreground">
              {options?.title}
            </AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription className="font-body text-[12px] text-primary-foreground/70">
                {options.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-1 flex flex-row gap-2 sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              onClick={handleCancel}
              className="mt-0 h-auto w-full font-body text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] text-primary-foreground/80 hover:bg-primary-foreground/[0.08] hover:text-primary-foreground transition-all rounded-xl flex-1"
            >
              {options?.cancelText || "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`h-auto w-full font-body text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 transition-all rounded-xl flex-1 ${
                options?.variant === "destructive"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 shadow-[0_0_10px_rgb(239_68_68_/_0.15)]"
                  : "bg-gold text-charcoal border-none hover:bg-gold/90 shadow-[0_0_10px_hsl(var(--gold)/0.2)]"
              }`}
            >
              {options?.confirmText || "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
