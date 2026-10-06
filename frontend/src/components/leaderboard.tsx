import type { ReactElement } from 'react';
import type { LeaderboardRow } from '../lib/api';
import { formatCount } from '../lib/format';
import { Avatar } from './avatar';

type Props = {
  readonly rows: readonly LeaderboardRow[];
  /** Rank of the first row (offset pagination starts mid-ranking). */
  readonly firstRank?: number;
  readonly busy?: boolean;
};

/** What the dashboard card actually renders: name, score and avatar. */
export const Leaderboard = ({ rows, firstRank = 1, busy = false }: Props): ReactElement => (
  <ol className="leaderboard" aria-busy={busy}>
    {rows.map((row, index) => (
      <li key={row.id} className="leaderboard__row">
        <span className="leaderboard__rank">{firstRank + index}</span>
        <Avatar name={row.name} url={row.avatarUrl} />
        <span className="leaderboard__name">{row.name}</span>
        <span className="leaderboard__score">
          {formatCount(row.totalScore)}
          <span className="leaderboard__unit"> pts</span>
        </span>
      </li>
    ))}
  </ol>
);
