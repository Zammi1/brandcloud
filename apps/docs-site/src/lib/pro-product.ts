/** The public site never assumes that checkout is live merely because an app URL exists. */
const configuredOrigin = import.meta.env.PUBLIC_PRO_APP_ORIGIN?.trim();
function appOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch { return null; }
}
export const PRO_APP_ORIGIN = appOrigin(configuredOrigin);
export const PRO_APP_AVAILABLE = PRO_APP_ORIGIN !== null;
export const proAppUrl = (path = '/') => PRO_APP_ORIGIN ? new URL(path, `${PRO_APP_ORIGIN}/`).href : '/pro/#updates';
