// Quiet study background: three big blurred colour fields drift very slowly and shift hue over minutes.
// Pure CSS (no canvas, no JS loop), so it costs almost nothing and never competes with the question.
export function CalmBackdrop() {
  return (
    <div aria-hidden className="calm-bg">
      <span className="calm-blob calm-b1" />
      <span className="calm-blob calm-b2" />
      <span className="calm-blob calm-b3" />
      <span className="calm-vignette" />
    </div>
  );
}
