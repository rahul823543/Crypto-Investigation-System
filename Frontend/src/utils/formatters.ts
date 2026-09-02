/**
 * Format a number as USD currency
 */
export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Format an ISO date string for display
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string with time
 */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a risk score as a display string
 */
export function formatRiskScore(score: number): string {
  return `${Math.round(score)}/100`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a confidence percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get relative time from now (e.g. "2 hours ago")
 */
export function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);

  const intervals: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];

  for (const [secondsInInterval, label] of intervals) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${label}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}
