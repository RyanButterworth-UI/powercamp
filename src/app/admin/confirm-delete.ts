import { UiService } from '../ui/ui.service';

/**
 * Two-step gate in front of every admin delete: confirm what's about to go,
 * then collect the delete password. Returns the password, or null if the
 * operator backed out at either step.
 *
 * The password is deliberately asked for every single time — unlike the editor
 * unlock there is no "delete is unlocked for this session" token, so nobody
 * clears one dialog and then deletes a whole column of rows unchallenged.
 */
export async function askToDelete(ui: UiService, what: string): Promise<string | null> {
  const ok = await ui.confirm(
    `Delete ${what}? The record disappears from the dashboard, the export and the stats. ` +
      `It can be restored from the database if this is a mistake.`,
    'Delete',
    'Cancel'
  );
  if (!ok) return null;

  const password = await ui.prompt({
    text: `Enter the delete password to delete ${what}.`,
    placeholder: 'Delete password',
    inputType: 'password',
    confirmLabel: 'Delete',
  });
  return password || null;
}

/**
 * Turns a failed delete into something the operator can act on. The backend
 * splits 401 (admin session expired) from 403 (wrong delete password) so these
 * two never get confused — they need opposite responses.
 */
export function deleteErrorMessage(err: unknown): string {
  switch ((err as { status?: number })?.status) {
    case 403:
      return 'Wrong delete password.';
    case 401:
      return 'Session expired — sign in again.';
    case 429:
      return 'Too many delete attempts. Wait a few minutes and try again.';
    case 404:
      return 'Already deleted — refresh the page.';
    default:
      return 'Failed to delete.';
  }
}
