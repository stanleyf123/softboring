export function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#fff4e8" stroke="#ead6c8" />
      <path
        d="M12.2 7.2c1.7 0 2.9.6 3.6 1.1l-1.1 1.4c-.5-.4-1.3-.8-2.5-.8-1.9 0-3.4 1.5-3.4 3.2 0 1.8 1.5 3.2 3.4 3.2 1.6 0 2.5-.7 2.9-1.3h-2.9v-1.7h4.8c.1.4.1.8.1 1.3 0 2.8-1.9 4.8-4.9 4.8-2.9 0-5.2-2.3-5.2-5.1 0-2.9 2.3-5.1 5.2-5.1Z"
        fill="#c47f6e"
      />
    </svg>
  );
}

export function LineMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="16" rx="7" fill="#d5e6d8" />
      <path
        d="M8 17.5 9.4 15.2c-.2 0-.3.1-.5.1-2.6 0-4.7-1.8-4.7-4.1C4.2 8.8 6.8 7 12 7s7.8 1.8 7.8 4.2c0 2.3-2.1 4.1-4.7 4.1H8Z"
        fill="#7d9b8c"
      />
      <circle cx="9" cy="11.2" r="0.9" fill="#fff8f2" />
      <circle cx="12" cy="11.2" r="0.9" fill="#fff8f2" />
      <circle cx="15" cy="11.2" r="0.9" fill="#fff8f2" />
    </svg>
  );
}
