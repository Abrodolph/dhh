import type { AttemptResult } from "@/lib/types";

export default function AttemptRow({
  result,
  index,
}: {
  result: AttemptResult | null;
  index: number;
}) {
  if (!result) {
    return (
      <div className="flex h-11 items-center rounded-sm border border-paper/10 px-3 text-smoke/50 text-sm">
        {index + 1}
      </div>
    );
  }
  if (result.kind === "skip") {
    return (
      <div className="row-in flex h-11 items-center rounded-sm border border-amber bg-amber/10 px-3 text-amber text-sm">
        🔇 Skipped
      </div>
    );
  }
  const correct = result.kind === "correct";
  const border = correct
    ? "border-leaf bg-leaf/10 text-leaf"
    : "border-sindoor bg-sindoor/10 text-sindoor";
  return (
    <div className={`row-in flex h-11 items-center justify-between rounded-sm border px-3 text-sm ${border}`}>
      <span className="truncate">{result.title}</span>
      <span className="ml-2 shrink-0 text-xs opacity-70">
        {correct ? "✓" : "✗"}
      </span>
    </div>
  );
}
