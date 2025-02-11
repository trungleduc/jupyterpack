export function removePrefix(path: string, prefix: string): string {
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  // If the prefix doesn't match, return the original path
  return path;
}
