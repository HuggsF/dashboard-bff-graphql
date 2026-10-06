import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/** Stable hue per name, so the fallback looks the same on every tab. */
const hueOf = (name: string): number =>
  [...name].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 7);

/** The avatar field. Falls back to initials when the URL is null or the image cannot load (offline). */
export const Avatar = ({
  name,
  url,
}: {
  readonly name: string;
  readonly url: string | null;
}): ReactElement => {
  const [failed, setFailed] = useState(false);

  if (url === null || failed) {
    return (
      <span
        className="avatar avatar--initials"
        style={{ '--avatar-hue': hueOf(name) } as CSSProperties}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
    );
  }
  return (
    <img
      className="avatar"
      src={url}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};
