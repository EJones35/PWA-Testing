import { getAllTasks, addTask } from './db.js'
import { setState, getState } from './state.js'
import { initTaskList } from './components/TaskList.js'
import { initTheme, toggleTheme } from './theme.js'

let deferredPrompt = null

async function init() {
  initTheme()

  const tasks = await getAllTasks()
  setState({ tasks, isLoading: false })

  const taskListEl = document.getElementById('taskList')
  initTaskList(taskListEl)

  const addBtn = document.getElementById('addButton')
  const taskInput = document.getElementById('taskInput')

  addBtn.addEventListener('click', () => addNewTask())
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addNewTask()
  })

  const themeBtn = document.getElementById('themeToggle')
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme)
  }

  const installBtn = document.getElementById('installBtn')
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt()
        const result = await deferredPrompt.userChoice
        if (result.outcome === 'accepted') {
          console.log('User accepted install prompt')
        }
        deferredPrompt = null
        installBtn.classList.add('hidden')
      }
    })
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    installBtn.classList.remove('hidden')
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installBtn.classList.add('hidden')
    console.log('PWA was installed')
  })

  if ('serviceWorker' in navigator) {
    registerSW()
  }
}

async function addNewTask() {
  const input = document.getElementById('taskInput')
  const text = input.value.trim()
  if (!text) return

  const prioritySelect = document.getElementById('prioritySelect')
  const dueDateInput = document.getElementById('dueDateInput')
  const categoryInput = document.getElementById('categoryInput')

  const categories = categoryInput.value
    ? categoryInput.value.split(',').map(c => c.trim()).filter(Boolean)
    : []

  const task = await addTask({
    text,
    priority: prioritySelect.value,
    dueDate: dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null,
    categories
  })

  input.value = ''
  dueDateInput.value = ''
  categoryInput.value = ''
  input.focus()

  const all = await getAllTasks()
  setState({ tasks: all })
}

async function registerSW() {
  if (!navigator.serviceWorker) return

  try {
    const reg = await navigator.serviceWorker.register('./sw.js')

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      return
    }

    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          newSW.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })
  } catch (err) {
    console.error('Service Worker registration failed:', err)
  }
}

document.addEventListener('DOMContentLoaded', init)
