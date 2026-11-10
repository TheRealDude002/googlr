import { PushpinIcon } from '../Icons';

export default function Loading() {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <div className="loading-pin" aria-hidden="true">
        <PushpinIcon />
      </div>
      <p className="loading-text">pinning results to board&hellip;</p>
    </div>
  );
}
