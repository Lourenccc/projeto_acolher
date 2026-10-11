'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Elemento que recebe o foco ao abrir. Se ausente, usa `[data-autofocus]` ou o primeiro focável. */
  initialFocusRef?: RefObject<HTMLElement>;
  children: ReactNode;
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

function restoreFocus(el: HTMLElement | null) {
  if (el && el.isConnected) el.focus();
  else document.getElementById('conteudo')?.focus();
}

/**
 * Modal acessível baseado no <dialog> nativo (showModal):
 * - conteúdo de fundo inerte e foco preso dentro do diálogo;
 * - Esc e clique no fundo fecham; o foco volta ao elemento que abriu o modal;
 * - título e descrição ligados via aria-labelledby / aria-describedby.
 * O conteúdo só é montado enquanto aberto, então formulários reiniciam a cada abertura.
 */
export function Modal({ open, onClose, title, description, size = 'md', initialFocusRef, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  const shownRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    openRef.current = open;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      const target = initialFocusRef?.current ?? dialog.querySelector<HTMLElement>('[data-autofocus]');
      target?.focus();
      shownRef.current = true;
    } else if (!open && shownRef.current) {
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
      restoreFocus(returnFocusRef.current);
      shownRef.current = false;
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) {
        dialog.close();
        document.body.style.overflow = '';
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      // Fallback: alguns navegadores fecham o diálogo mesmo com preventDefault no Esc.
      onClose={() => {
        if (openRef.current) onCloseRef.current();
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
      className={cn(
        'w-[calc(100%-2rem)] rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/50',
        sizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <div id={descriptionId} className="mt-1 text-sm text-slate-500">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Fechar"
              className="-m-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Formulário que ocupa o corpo + rodapé do modal (permite botão submit no rodapé). */
export const modalFormClass = 'flex min-h-0 flex-1 flex-col';
