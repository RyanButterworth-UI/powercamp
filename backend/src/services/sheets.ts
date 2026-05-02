import { env } from '../env';

export type SheetFormType = 'registration' | 'consent' | 'feedback';

export async function postToAppsScript(
  payload: Record<string, unknown>,
  formType: SheetFormType
): Promise<unknown> {
  const body = formType === 'registration' ? payload : { ...payload, formType };
  const response = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}
