import { joinUrls } from './utils';
import { isPlainObject } from '@reduxjs/toolkit';
import { BaseQueryFn } from './apiTypes';

export type ResponseHandler = 'json' | 'text' | ((response: Response) => Promise<any>);

// We need to control most of these types to allow for more flexible headers
interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
}

declare var Headers: {
  prototype: Headers;
  new (init?: CustomHeadersInit): Headers;
};
export type CustomHeadersInit = Headers | string[][] | Record<string, string | undefined>;
export interface CustomRequestInit {
  /**
   * A BodyInit object or null to set request's body.
   */
  body?: BodyInit | null;
  /**
   * A string indicating how the request will interact with the browser's cache to set request's cache.
   */
  cache?: RequestCache;
  /**
   * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
   */
  credentials?: RequestCredentials;
  /**
   * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
   */
  headers?: CustomHeadersInit;
  /**
   * A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
   */
  integrity?: string;
  /**
   * A boolean to set request's keepalive.
   */
  keepalive?: boolean;
  /**
   * A string to set request's method.
   */
  method?: string;
  /**
   * A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
   */
  mode?: RequestMode;
  /**
   * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
   */
  redirect?: RequestRedirect;
  /**
   * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
   */
  referrer?: string;
  /**
   * A referrer policy to set request's referrerPolicy.
   */
  referrerPolicy?: ReferrerPolicy;
  /**
   * An AbortSignal to set request's signal.
   */
  signal?: AbortSignal | null;
  /**
   * Can only be null. Used to disassociate request from any Window.
   */
  window?: any;
}

export interface FetchArgs extends CustomRequestInit {
  url: string;
  params?: Record<string, any>;
  body?: any;
  responseHandler?: ResponseHandler;
  validateStatus?: (response: Response, body: any) => boolean;
}

const defaultValidateStatus = (response: Response) => response.status >= 200 && response.status <= 299;

const isJsonContentType = (headers: Headers) => headers.get('content-type')?.trim()?.startsWith('application/json');

const handleResponse = async (response: Response, responseHandler: ResponseHandler) => {
  if (typeof responseHandler === 'function') {
    return responseHandler(response);
  }

  if (responseHandler === 'text') {
    return response.text();
  }

  if (responseHandler === 'json') {
    const text = await response.text();
    return text.length ? JSON.parse(text) : undefined;
  }
};

export interface FetchBaseQueryError {
  status: number;
  data: unknown;
}

export function fetchBaseQuery({
  baseUrl,
  prepareHeaders = (x) => x,
  fetchFn = fetch,
  ...baseFetchOptions
}: {
  baseUrl?: string;
  prepareHeaders?: (headers: Headers, api: { getState: () => unknown }) => Headers;
  /**
   * Accepts a custom `fetch` function if you do not want to use the default on the window.
   * Useful in SSR environments if you need to pass isomorphic-fetch or cross-fetch
   */
  fetchFn?: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
} & RequestInit = {}): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}> {
  return async (arg, { signal, getState }) => {
    let {
      url,
      method = 'GET' as const,
      headers = new Headers({}),
      body = undefined,
      params = undefined,
      responseHandler = 'json' as const,
      validateStatus = defaultValidateStatus,
      ...rest
    } = typeof arg == 'string' ? { url: arg } : arg;
    let config: RequestInit = {
      ...baseFetchOptions,
      method,
      signal,
      body,
      ...rest,
    };

    let tempHeaders = prepareHeaders(new Headers(headers), { getState });

    tempHeaders.forEach((value, key) => {
      if (value === 'undefined') {
        tempHeaders.delete(key);
      }
    });

    if (!tempHeaders.has('content-type')) {
      tempHeaders.set('content-type', 'application/json');
    }

    if (body && isPlainObject(body) && isJsonContentType(tempHeaders)) {
      config.body = JSON.stringify(body);
    }

    if (params) {
      const divider = ~url.indexOf('?') ? '&' : '?';
      const query = new URLSearchParams(params);
      url += divider + query;
    }

    url = joinUrls(baseUrl, url);

    config.headers = tempHeaders as any;

    const response = await fetchFn(url, config);
    const resultData = await handleResponse(response, responseHandler);

    return validateStatus(response, resultData)
      ? { data: resultData }
      : { error: { status: response.status, data: resultData } };
  };
}
