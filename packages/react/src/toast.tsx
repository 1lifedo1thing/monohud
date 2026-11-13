'use client';
import * as React from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { useMonohud } from './provider';
import { CloseIcon } from './utils';

export type ToastType = 'info' | 'ok' | 'warn' | 'danger';

export type ToastOptions = {
  title: string;
  description?: string;
  type?: ToastType;
  /** Milliseconds before dismissal; 0 keeps it until closed. */
  timeout?: number;
};

/** The returned functions are stable, so they are safe in effect dependencies. */
export function useToast() {
  const manager = BaseToast.useToastManager();
  const latest = React.useRef(manager);
  latest.current = manager;
  return React.useMemo(
    () => ({
      toast: ({ title, description, type = 'info', timeout = 5000 }: ToastOptions) =>
        latest.current.add({ title, description, type, timeout }),
      close: (id: string) => latest.current.close(id),
    }),
    [],
  );
}

const TAGS: Record<ToastType, string> = { info: 'INFO', ok: 'OK', warn: 'WARN', danger: 'ALERT' };

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <BaseToast.Root key={toast.id} toast={toast} className="mh-toast mh-cut">
      <BaseToast.Content className="mh-toast__content">
        <span className="mh-toast__mark" aria-hidden="true" />
        <span className="mh-toast__head">
          <BaseToast.Title className="mh-toast__title" />
          <span className="mh-toast__tag mh-micro" aria-hidden="true">
            {TAGS[(toast.type as ToastType | undefined) ?? 'info']}
          </span>
        </span>
        <BaseToast.Description className="mh-toast__description" />
        <BaseToast.Close className="mh-toast__close" aria-label="Close" data-mh-bleep="back">
          <CloseIcon />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  ));
}

export function ToastLayer() {
  const { container } = useMonohud();
  return (
    <BaseToast.Portal container={container}>
      <BaseToast.Viewport className="mh-toast-viewport">
        <ToastList />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
