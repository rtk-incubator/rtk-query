interface UnwrappableAction {
  status: string;
  endpoint: string;
  data?: any;
  error?: any;
}

type UnwrappedActionPayload<T extends UnwrappableAction> = Exclude<T, { error: any }>['data'];

export function unwrap<R extends UnwrappableAction>(action: R): UnwrappedActionPayload<R> {
  if (action.error) {
    throw action.error;
  }
  return action.data;
}
