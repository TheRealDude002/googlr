'use client';

export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      <div className="toast">{message}</div>
    </div>
  );
}
