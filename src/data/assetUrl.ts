/** Join a public/ asset path with Vite's base (e.g. `/tarot/` on GitHub Pages). */
export function assetUrl(path: string): string {
  const normalized = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${normalized}`
}
