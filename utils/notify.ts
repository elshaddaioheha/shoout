import { useToastStore, type ToastType } from '@/store/useToastStore';

function devLog(method: 'error' | 'warn' | 'info', context: string, payload?: unknown) {
  if (!__DEV__) return;
  if (method === 'error') {
    console.error(`[notify] ${context}`, payload ?? '');
    return;
  }
  if (method === 'warn') {
    console.warn(`[notify] ${context}`, payload ?? '');
    return;
  }
  console.info(`[notify] ${context}`, payload ?? '');
}

export function notifyUser(message: string, type: ToastType = 'info') {
  useToastStore.getState().showToast(message, type);
}

export function notifyError(context: string, error?: unknown, userMessage?: string) {
  devLog('error', context, error);
  if (userMessage) {
    notifyUser(userMessage, 'error');
  }
}

export function notifyWarning(context: string, warning?: unknown, userMessage?: string) {
  devLog('warn', context, warning);
  if (userMessage) {
    notifyUser(userMessage, 'info');
  }
}

export function notifyInfo(context: string, details?: unknown, userMessage?: string) {
  devLog('info', context, details);
  if (userMessage) {
    notifyUser(userMessage, 'info');
  }
}
