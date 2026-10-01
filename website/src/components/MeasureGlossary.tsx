export function MeasureGlossary() {
  return (
    <p className="examples-note">
      <strong>EE</strong> engine eval: the engine’s score for the side to move. <strong>N</strong> viable count: how
      many inspected lines stay within a tolerance of the best line. <strong>MCI</strong> Move Criticality Index: the
      expected-score drop from the best move to the second-best. <strong>ATP</strong> absolute time pressure: nonlinear
      pressure from a player’s own remaining time in the stage. <strong>RTP</strong> relative time pressure: the signed
      clock imbalance between a player and the opponent. Positive means that player has less time.
    </p>
  );
}
