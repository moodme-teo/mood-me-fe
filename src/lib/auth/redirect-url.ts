const LOCAL_SITE_ORIGIN = "http://localhost:3000";
const PRODUCTION_SITE_ORIGIN = "https://mood-me.vercel.app";

function normalizeOrigin(value: string | undefined) {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function isLocalOrigin(origin: string) {
  const { hostname } = new URL(origin);

  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getSiteOrigin(currentOrigin?: string) {
  const requestOrigin = normalizeOrigin(currentOrigin);
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment && requestOrigin && isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  if (configuredOrigin && (isDevelopment || !isLocalOrigin(configuredOrigin))) {
    return configuredOrigin;
  }

  if (requestOrigin && (isDevelopment || !isLocalOrigin(requestOrigin))) {
    return requestOrigin;
  }

  return isDevelopment ? LOCAL_SITE_ORIGIN : PRODUCTION_SITE_ORIGIN;
}

export function getSafeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, LOCAL_SITE_ORIGIN);

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function getLoginPath(returnTo: string) {
  const safeReturnPath = getSafeReturnPath(returnTo);
  const loginUrl = new URL("/login", LOCAL_SITE_ORIGIN);

  if (safeReturnPath !== "/") {
    loginUrl.searchParams.set("next", safeReturnPath);
  }

  return `${loginUrl.pathname}${loginUrl.search}`;
}

export function getAuthCallbackUrl(currentOrigin: string, returnTo?: string) {
  const callbackUrl = new URL("/auth/callback", getSiteOrigin(currentOrigin));
  const safeReturnPath = getSafeReturnPath(returnTo);

  if (safeReturnPath !== "/") {
    callbackUrl.searchParams.set("next", safeReturnPath);
  }

  return callbackUrl.toString();
}
