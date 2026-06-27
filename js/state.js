const listeners = new Map()
let state = {
  tasks: [],
  filter: 'all',
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  isLoading: true
}

export function getState() {
  return { ...state }
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set())
  }
  listeners.get(key).add(fn)
  return () => listeners.get(key).delete(fn)
}

function notify(key) {
  const fns = listeners.get(key)
  if (fns) {
    fns.forEach(fn => fn(state))
  }
}

function notifyAll() {
  listeners.forEach((fns) => {
    fns.forEach(fn => fn(state))
  })
}

export function setState(updates) {
  const prev = { ...state }
  state = { ...state, ...updates }
  for (const key of Object.keys(updates)) {
    if (prev[key] !== state[key]) {
      notify(key)
    }
  }
  notifyAll()
}

export function getFilteredTasks() {
  let tasks = [...state.tasks]

  if (state.filter === 'active') {
    tasks = tasks.filter(t => !t.completed && !t.archived)
  } else if (state.filter === 'completed') {
    tasks = tasks.filter(t => t.completed && !t.archived)
  } else if (state.filter === 'archived') {
    tasks = tasks.filter(t => t.archived)
  } else {
    tasks = tasks.filter(t => !t.archived)
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase()
    tasks = tasks.filter(t =>
      t.text.toLowerCase().includes(q) ||
      (t.categories && t.categories.some(c => c.toLowerCase().includes(q)))
    )
  }

  const sortField = state.sortBy
  const order = state.sortOrder === 'desc' ? -1 : 1

  tasks.sort((a, b) => {
    if (sortField === 'priority') {
      const priorityMap = { high: 3, medium: 2, low: 1 }
      return (priorityMap[b.priority] - priorityMap[a.priority]) * order
    }
    if (sortField === 'dueDate') {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return (new Date(a.dueDate) - new Date(b.dueDate)) * order
    }
    if (sortField === 'text') {
      return a.text.localeCompare(b.text) * order
    }
    return (new Date(b.createdAt) - new Date(a.createdAt)) * order
  })

  return tasks
}
