'use client';

import { useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { Alert } from './Alert';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  warning?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

/** Confirmação antes de ações sensíveis. O foco inicial fica no botão seguro ("Voltar"). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  tone = 'danger',
  warning,
  loading = false,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={description}
      size="sm"
      initialFocusRef={cancelRef}
    >
      <ModalBody>
        {warning && (
          <div className="flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{warning}</p>
          </div>
        )}
        {children}
        {error && <Alert tone="error">{error}</Alert>}
      </ModalBody>
      <ModalFooter>
        <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
