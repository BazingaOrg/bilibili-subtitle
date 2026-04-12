export const openUrl = (url?: string, target?: string, features?: string) => {
  if (typeof url === 'string' && url.length > 0) {
    window.open(url, target, features)
  }
}

export const isDarkMode = () => {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
}
