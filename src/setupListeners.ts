import { createAction, ThunkDispatch } from '@reduxjs/toolkit';

export const onFocus = createAction('__rtkq/focused');
export const onFocusLost = createAction('__rtkq/unfocused');
export const onOnline = createAction('__rtkq/online');
export const onOffline = createAction('__rtkq/offline');

let initialized = false;
export function setupListeners(dispatch: ThunkDispatch<any, any, any>) {
  if (initialized) return;

  if (typeof window !== 'undefined' && window.addEventListener) {
    // Handle focus events
    window.addEventListener(
      'visibilitychange',
      () => {
        if (window.document.visibilityState === 'visible') {
          dispatch(onFocus());
        } else {
          dispatch(onFocusLost());
        }
      },
      false
    );

    // Handle connection events
    window.addEventListener('online', () => dispatch(onOnline()), false);
    window.addEventListener('offline', () => dispatch(onOffline()), false);
    initialized = true;
  }
}
