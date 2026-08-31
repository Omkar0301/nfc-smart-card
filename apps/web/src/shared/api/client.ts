const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
}

async function readError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string } & Record<string, unknown>;
  };
  const err = body.error ?? {};
  throw new ApiError(
    res.status,
    err.code ?? "UNKNOWN",
    err.message ?? res.statusText,
    err
  );
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });

    if (!res.ok) {
      setAccessToken(null);
      setRefreshToken(null);
      return false;
    }

    const data = (await res.json()) as { accessToken: string; refreshToken?: string };
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return true;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, skipRefresh, headers, ...rest } = options;

  const buildHeaders = (): Headers => {
    const next = new Headers(headers);
    if (!next.has("Content-Type") && rest.body) {
      next.set("Content-Type", "application/json");
    }
    if (!skipAuth && accessToken) {
      next.set("Authorization", `Bearer ${accessToken}`);
    }
    return next;
  };

  const request = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: buildHeaders(),
    });

  let res = await request();

  if (res.status === 401 && !skipRefresh && !path.startsWith("/auth/refresh")) {
    const errorBody = (await res.clone().json().catch(() => ({}))) as {
      error?: { code?: string };
    };
    if (errorBody.error?.code === "TOKEN_EXPIRED" || !skipAuth) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        res = await request();
      }
    }
  }

  if (!res.ok) {
    await readError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export { tryRefresh };
