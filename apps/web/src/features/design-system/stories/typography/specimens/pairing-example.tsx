export function PairingExample() {
  return (
    <article
      style={{
        maxWidth: '38rem',
        padding: '2rem 2.25rem',
        border: '1px solid var(--gray-5)',
        borderRadius: '0.75rem',
        background: 'var(--gray-1)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-brand)',
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          color: 'var(--accent-11)',
          marginBottom: '0.5rem',
        }}
      >
        SRD 5.1 / SPELL
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2.25rem',
          fontWeight: 600,
          lineHeight: 'var(--line-height-heading)',
          margin: '0 0 0.25rem',
        }}
      >
        Fireball
      </h2>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          fontStyle: 'italic',
          color: 'var(--gray-11)',
          marginBottom: '1.5rem',
        }}
      >
        3rd-level evocation
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          lineHeight: 'var(--line-height-body)',
          margin: '0 0 1.25rem',
        }}
      >
        A bright streak flashes from your pointing finger to a point you choose
        within range and then blossoms with a low roar into an explosion of
        flame. Each creature in a 20-foot-radius sphere centered on that point
        must make a{' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9em',
            background: 'var(--gray-3)',
            padding: '0.05em 0.35em',
            borderRadius: '0.25em',
          }}
        >
          DEX save
        </code>{' '}
        or take{' '}
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9em',
            background: 'var(--gray-3)',
            padding: '0.05em 0.35em',
            borderRadius: '0.25em',
          }}
        >
          8d6
        </code>{' '}
        fire damage on a failed save, or half as much on a successful one.
      </p>
      <pre
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          lineHeight: 'var(--line-height-mono)',
          background: 'var(--gray-3)',
          padding: '0.875rem 1rem',
          borderRadius: '0.5rem',
          margin: 0,
          overflowX: 'auto',
        }}
      >
        {`components:    V, S, M (a tiny ball of bat guano and sulfur)
casting_time:  1 action
range:         150 feet
duration:      instantaneous`}
      </pre>
    </article>
  );
}
