export type SoftEmptyKind = "wall" | "history" | "activity";

/** Lightweight CSS shapes — cream, blush, peach, mint. No image assets. */
export function SoftCssEmpty({
  kind,
  className = "",
}: {
  kind: SoftEmptyKind;
  className?: string;
}) {
  return (
    <div
      className={`soft-empty-illu animate-[soft-empty-float_4s_ease-in-out_infinite] ${className}`}
      data-empty-illu={kind}
      aria-hidden="true"
    >
      {kind === "wall" ? (
        <>
          <span className="soft-empty-board" />
          <span className="soft-empty-note soft-empty-note-a" />
          <span className="soft-empty-note soft-empty-note-b" />
          <span className="soft-empty-pin" />
        </>
      ) : null}
      {kind === "history" ? (
        <>
          <span className="soft-empty-sheet soft-empty-sheet-back" />
          <span className="soft-empty-sheet soft-empty-sheet-front">
            <span className="soft-empty-line" />
            <span className="soft-empty-line is-short" />
            <span className="soft-empty-line is-shorter" />
          </span>
          <span className="soft-empty-bloom" />
        </>
      ) : null}
      {kind === "activity" ? (
        <>
          <span className="soft-empty-thread" />
          <span className="soft-empty-bead is-a" />
          <span className="soft-empty-bead is-b" />
          <span className="soft-empty-bead is-c" />
        </>
      ) : null}
    </div>
  );
}
