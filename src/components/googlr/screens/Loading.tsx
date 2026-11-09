export default function Loading() {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-pin" aria-hidden="true">
        📌
      </div>
      <p className="loading-text">pinning results to board&hellip;</p>
    </div>
  );
}
