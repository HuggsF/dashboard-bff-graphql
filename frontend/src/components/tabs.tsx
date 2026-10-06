import { useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';

type Tab<T extends string> = { readonly id: T; readonly label: string; readonly caption: string };

type Props<T extends string> = {
  readonly tabs: readonly Tab<T>[];
  readonly active: T;
  readonly onChange: (id: T) => void;
};

/** WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends. */
export const Tabs = <T extends string>({ tabs, active, onChange }: Props<T>): ReactElement => {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length];
    if (next === undefined) return;
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="API approaches">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element === null) refs.current.delete(tab.id);
              else refs.current.set(tab.id, element);
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`tab tab--${tab.id}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span className="tab__label">{tab.label}</span>
            <span className="tab__caption">{tab.caption}</span>
          </button>
        );
      })}
    </div>
  );
};
