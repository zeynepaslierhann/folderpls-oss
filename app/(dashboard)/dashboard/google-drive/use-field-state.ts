import { useState, type Dispatch, type SetStateAction } from "react";

export type FieldSetters<S> = {
  [K in keyof S & string as `set${Capitalize<K>}`]: Dispatch<SetStateAction<S[K]>>;
};

/**
 * One state record that exposes every field as `field` + `setField`.
 * Setters keep their identity between renders and skip no-op writes, like plain useState.
 * Field values must not be functions.
 */
export function useFieldState<S extends object>(initial: S): S & FieldSetters<S> {
  const [values, setValues] = useState(initial);

  const [setters] = useState(() => {
    const pairs = (Object.keys(initial) as (keyof S & string)[]).map((field) => {
      const write = (action: SetStateAction<S[typeof field]>) =>
        setValues((current) => {
          const incoming =
            typeof action === "function"
              ? (action as (previous: S[typeof field]) => S[typeof field])(current[field])
              : action;
          return Object.is(incoming, current[field]) ? current : { ...current, [field]: incoming };
        });
      return [`set${field.charAt(0).toUpperCase()}${field.slice(1)}`, write] as const;
    });
    return Object.fromEntries(pairs) as FieldSetters<S>;
  });

  return { ...values, ...setters };
}
