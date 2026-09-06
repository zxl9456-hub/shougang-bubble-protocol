// Both the root-domain deployment and GitHub project Pages use the same assets.
export function assetUrl(path) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${base}${path}`;
}
