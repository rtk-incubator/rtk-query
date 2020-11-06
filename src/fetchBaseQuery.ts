import { QueryApi } from './buildThunks';
import { isPlainObject } from './utils';

interface FetchArgs extends RequestInit {
  url: string;
  params?: URLSearchParams | Record<string, string>;
  body?: any;
  responseHandler?: 'json' | 'text' | ((response: Response) => Promise<any>);
  validateStatus?: (response: Response, body: any) => boolean;
}

const defaultValidateStatus = (response: Response) => response.status >= 200 && response.status <= 299;

const isJsonContentType = (headers: Headers) => headers.get('content-type')?.trim()?.startsWith('application/json');

// accept `params` and automatically stringify and set the url or whatnot
// JSON.stringify(body) if body is set and type of content is json
// note: and fetchBaseQuery should probably have a prepareHeaders method option --- baseQuery has access to thunkApi aka (dispatch, getState)
export function fetchBaseQuery({ baseUrl }: { baseUrl: string } = { baseUrl: window.location.href }) {
  return async (arg: string | FetchArgs, { signal, rejectWithValue }: QueryApi) => {
    const {
      url,
      method = 'GET',
      headers = undefined,
      body = undefined,
      params = undefined,
      responseHandler = 'json',
      validateStatus = defaultValidateStatus,
      ...rest
    } = typeof arg == 'string' ? { url: arg } : arg;
    let config: RequestInit = {
      method,
      signal,
      ...rest,
    };
    config.headers = new Headers(headers);
    if (!config.headers.has('content-type')) {
      config.headers.set('content-type', 'application/json');
    }

    if (body && isPlainObject(body) && isJsonContentType(config.headers)) {
      config.body = JSON.stringify(body);
    }

    const urlObject = new URL(url, baseUrl);
    if (params) {
      const searchParams = new URLSearchParams(params);
      searchParams.forEach((k, v) => {
        urlObject.searchParams.append(k, v);
      });
    }
    const response = await fetch(urlObject.href, config);

    let resultData;
    switch (responseHandler) {
      case 'json':
        resultData = await response.json();
        break;
      case 'text':
        resultData = await response.text();
        break;
      default:
        resultData = await responseHandler(response);
        break;
    }

    return validateStatus(response, resultData)
      ? resultData
      : rejectWithValue({ status: response.status, data: resultData });
  };
}
