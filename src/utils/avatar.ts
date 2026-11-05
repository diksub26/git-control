/**
 * Generates an avatar URL for a Git author using GitHub noreply email detection,
 * Gravatar hash, or UI avatar fallback.
 */
export function getAuthorAvatarUrl(authorName: string, authorEmail: string): string {
  const email = (authorEmail || '').trim().toLowerCase();

  // Check if GitHub noreply email: e.g. 12345+username@users.noreply.github.com or username@users.noreply.github.com
  const ghMatch = email.match(/^(?:\d+\+)?([a-z0-9-]+)@users\.noreply\.github\.com$/i);
  if (ghMatch && ghMatch[1]) {
    return `https://github.com/${ghMatch[1]}.png?size=64`;
  }

  // Fallback to deterministic SVG initials avatar with vibrant background
  const initials = (authorName || 'G')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = [
    '#0284c7',
    '#db2777',
    '#059669',
    '#d97706',
    '#7c3aed',
    '#e11d48',
    '#0d9488',
    '#4f46e5',
  ];
  const bg = palette[Math.abs(hash) % palette.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="32" fill="${bg}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-weight="600" font-size="24">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
