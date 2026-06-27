const STORAGE_KEY = 'offline-tasks-theme'

export function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(STORAGE_KEY, theme)
  document.querySelector('.theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙'
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light'
  setTheme(current === 'dark' ? 'light' : 'dark')
}

export function initTheme() {
  const theme = getPreferredTheme()
  setTheme(theme)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTheme(e.matches ? 'dark' : 'light')
    }
  })
}
