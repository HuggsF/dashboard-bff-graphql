import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { BffPanel } from './components/bff-panel';
import { ComparisonPanel } from './components/comparison-panel';
import { GraphqlPanel } from './components/graphql-panel';
import { LegacyPanel } from './components/legacy-panel';
import { Tabs } from './components/tabs';
import { compareApproaches } from './lib/compare';
import { APPROACH_LABEL, APPROACHES } from './lib/types';
import type { Approach, ResultsByApproach } from './lib/types';

const TABS = [
  { id: 'legacy', label: APPROACH_LABEL.legacy, caption: 'v1 · SELECT * · everything' },
  { id: 'bff', label: APPROACH_LABEL.bff, caption: 'v2 · projection · offset' },
  { id: 'graphql', label: APPROACH_LABEL.graphql, caption: 'v3 · field selection · cursor' },
] as const satisfies readonly { id: Approach; label: string; caption: string }[];

const PANELS: Readonly<Record<Approach, () => ReactElement>> = {
  legacy: LegacyPanel,
  bff: BffPanel,
  graphql: GraphqlPanel,
};

export const App = (): ReactElement => {
  const [results, setResults] = useState<ResultsByApproach | null>(null);
  const [running, setRunning] = useState<Approach | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Approach>('legacy');
  // Tabs mount on first visit and stay mounted, so switching back does not re-download 9 MB.
  const [visited, setVisited] = useState<ReadonlySet<Approach>>(new Set(['legacy']));
  // The tabs only start fetching after the first side-by-side run, so they do not skew its timings.
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  const runComparison = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      setResults(await compareApproaches(setRunning));
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setRunning(null);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runComparison();
  }, [runComparison]);

  const selectTab = (approach: Approach): void => {
    setActive(approach);
    setVisited((previous) => new Set(previous).add(approach));
  };

  return (
    <div className="app">
      <header className="hero">
        <p className="hero__eyebrow">dashboard-bff-graphql</p>
        <h1>Same card, three APIs</h1>
        <p className="hero__lead">
          The dashboard shows each student&apos;s name, total score and avatar. The legacy endpoint
          answers with every user and every relation (about 9 MB of JSON); the BFF and GraphQL
          answer with what the card renders. Every number on this page is measured live in your
          browser.
        </p>
      </header>

      <main>
        <ComparisonPanel
          results={results}
          running={running}
          error={error}
          onRun={() => void runComparison()}
        />

        <section className="explorer" aria-label="Each approach in detail">
          <Tabs tabs={TABS} active={active} onChange={selectTab} />
          {APPROACHES.map((approach) => {
            const Panel = PANELS[approach];
            return (
              <div
                key={approach}
                role="tabpanel"
                id={`panel-${approach}`}
                aria-labelledby={`tab-${approach}`}
                hidden={approach !== active}
                tabIndex={0}
              >
                {ready && visited.has(approach) ? (
                  <Panel />
                ) : (
                  <p className="placeholder">Waiting for the side-by-side run to finish…</p>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="page-footer">
        <p>
          Numbers come from <code>fetch</code> + the Resource Timing API (
          <code>encodedBodySize</code>) and the backend&apos;s <code>X-DB-Query-Count</code> header.
          Server-side benchmark: <code>GET /api/compare</code>.
        </p>
      </footer>
    </div>
  );
};
