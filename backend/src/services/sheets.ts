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
  if (!response.ok) {
    throw new Error(`Apps Script returned HTTP ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
