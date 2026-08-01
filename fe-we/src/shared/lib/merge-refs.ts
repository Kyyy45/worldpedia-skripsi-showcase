import * as React from 'react';

type ReactRef<T> = React.Ref<T> | ((node: T | null) => void) | undefined | null;

export function mergeRefs<T>(...refs: ReactRef<T>[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}
