import type { ReactNode } from 'react';
import { toast as sonnerToast, type ExternalToast } from 'sonner';

type NotificationKind = 'success' | 'info' | 'warning' | 'error' | 'loading' | 'message';

const DEFAULT_DURATION: Record<Exclude<NotificationKind, 'loading'>, number> = {
  success: 3200,
  info: 4400,
  warning: 5200,
  error: 6400,
  message: 4200,
};

const TECHNICAL_ERROR_PATTERN =
  /axios|network error|failed to fetch|request failed|status code|timeout|econn|sqlstate|stack trace|syntaxerror|typeerror|referenceerror|<!doctype|<html/i;

function textFromNode(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function notificationId(kind: NotificationKind, title: ReactNode): string | undefined {
  const text = textFromNode(title).toLocaleLowerCase('fr').replace(/\s+/g, ' ').slice(0, 96);
  return text ? `protein-notification:${kind}:${text}` : undefined;
}

function readingDuration(kind: Exclude<NotificationKind, 'loading'>, title: ReactNode, options: ExternalToast): number {
  const description = textFromNode(options.description);
  const characters = textFromNode(title).length + description.length;
  const readingTime = 1800 + characters * 28;
  return Math.min(Math.max(DEFAULT_DURATION[kind], readingTime), kind === 'error' ? 8000 : 6500);
}

function optionsFor(
  kind: Exclude<NotificationKind, 'loading'>,
  title: ReactNode,
  options: ExternalToast = {},
): ExternalToast {
  return {
    id: notificationId(kind, title),
    duration: readingDuration(kind, title, options),
    dismissible: true,
    ...options,
  };
}

function friendlyError(title: ReactNode, options: ExternalToast): { title: ReactNode; options: ExternalToast } {
  const message = textFromNode(title);
  const isTechnical = message.length > 180 || TECHNICAL_ERROR_PATTERN.test(message);

  if (!isTechnical) return { title, options };

  return {
    title: 'Impossible de terminer cette action',
    options: {
      description: options.description ?? 'Vérifiez votre connexion, puis réessayez.',
      ...options,
    },
  };
}

/**
 * Protein.tn's single notification entry point.
 * Stable IDs prevent duplicate feedback emitted by nested commerce components,
 * while per-state timing keeps success concise and errors readable.
 */
export const notify = {
  success(title: ReactNode, options: ExternalToast = {}) {
    return sonnerToast.success(title, optionsFor('success', title, options));
  },
  info(title: ReactNode, options: ExternalToast = {}) {
    return sonnerToast.info(title, optionsFor('info', title, options));
  },
  warning(title: ReactNode, options: ExternalToast = {}) {
    return sonnerToast.warning(title, optionsFor('warning', title, options));
  },
  error(title: ReactNode, options: ExternalToast = {}) {
    const friendly = friendlyError(title, options);
    return sonnerToast.error(friendly.title, optionsFor('error', friendly.title, friendly.options));
  },
  message(title: ReactNode, options: ExternalToast = {}) {
    return sonnerToast.message(title, optionsFor('message', title, options));
  },
  loading(title: ReactNode, options: ExternalToast = {}) {
    return sonnerToast.loading(title, {
      id: notificationId('loading', title),
      duration: Number.POSITIVE_INFINITY,
      dismissible: true,
      ...options,
    });
  },
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
};
