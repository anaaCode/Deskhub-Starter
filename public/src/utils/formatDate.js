export function formatDate(isoString) {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  }).format(new Date(isoString));
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(isoString));
}

export function formatRelative(isoString) {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(isoString);
}
