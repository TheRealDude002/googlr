'use client';

import type { ReactNode } from 'react';

type TackColor = 'red' | 'teal' | 'gold';

/** A glossy spherical thumbtack pinning the card to the board. */
export function Tack({ color }: { color: TackColor }) {
  return <span aria-hidden="true" className={`tack tack-${color}`} />;
}

interface NoteCardProps {
  tack: TackColor;
  title: string;
  /** animation delay in ms — staggered card drop */
  delay?: number;
  children: ReactNode;
}

/** A paper note pinned to the corkboard. */
export function NoteCard({ tack, title, delay = 0, children }: NoteCardProps) {
  return (
    <article className="note-card" style={{ animationDelay: `${delay}ms` }}>
      <Tack color={tack} />
      <h3 className="note-title">{title}</h3>
      {children}
    </article>
  );
}

/** The corkboard container — recessed into the linen page. */
export default function Corkboard({ children }: { children: ReactNode }) {
  return (
    <section className="corkboard" aria-label="Search results pinned to a corkboard">
      {children}
    </section>
  );
}
