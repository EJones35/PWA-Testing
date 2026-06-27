import { createTaskElement } from './TaskItem.js'
import { getFilteredTasks, getState, setState, subscribe } from '../state.js'
import { getAllTasks, updateTaskOrder, deleteCompletedTasks, archiveCompletedTasks } from '../db.js'

export function initTaskList(containerEl) {
  setupControls()
  setupDragDrop(containerEl)
  subscribe('tasks', () => render(containerEl))
  subscribe('filter', () => render(containerEl))
  subscribe('searchQuery', () => render(containerEl))
  subscribe('sortBy', () => render(containerEl))
  subscribe('sortOrder', () => render(containerEl))

  return render(containerEl)
}

async function render(containerEl) {
  const tasks = getFilteredTasks()
  containerEl.innerHTML = ''

  if (tasks.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'empty-state'
    empty.textContent = getState().searchQuery
      ? 'No tasks match your search.'
      : 'No tasks yet. Add one above!'
    containerEl.appendChild(empty)
    return
  }

  const fragment = document.createDocumentFragment()
  let prevOrder = -1

  for (const task of tasks) {
    const el = createTaskElement(task)
    el.draggable = true
    fragment.appendChild(el)
    prevOrder = task.order
  }

  const currentFilter = getState().filter
  if (tasks.length > 0 && currentFilter !== 'archived') {
    const bulkEl = document.createElement('li')
    bulkEl.className = 'bulk-actions'
    const completedCount = tasks.filter(t => t.completed).length
    bulkEl.innerHTML = `
      <span>${completedCount} completed</span>
      <div>
        <button class="secondary-btn archive-btn">Archive completed</button>
        <button class="secondary-btn danger-btn delete-completed-btn">Delete completed</button>
      </div>
    `
    fragment.appendChild(bulkEl)

    setTimeout(() => {
      const archiveBtn = bulkEl.querySelector('.archive-btn')
      const deleteBtn = bulkEl.querySelector('.delete-completed-btn')

      archiveBtn?.addEventListener('click', async () => {
        await archiveCompletedTasks()
        const all = await getAllTasks()
        setState({ tasks: all })
      })

      deleteBtn?.addEventListener('click', async () => {
        await deleteCompletedTasks()
        const all = await getAllTasks()
        setState({ tasks: all })
      })
    }, 0)
  }

  const sortControls = document.querySelector('.sort-controls')
  const activeCount = getState().filter === 'archived'
    ? tasks.length
    : tasks.filter(t => !t.completed).length
  if (sortControls) {
    sortControls.querySelector('.task-count').textContent = `${activeCount}${getState().filter === 'archived' ? '' : ' active'} task${activeCount !== 1 ? 's' : ''}`
  }

  containerEl.appendChild(fragment)
}

function setupControls() {
  const filterBtns = document.querySelectorAll('.filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      setState({ filter: btn.dataset.filter })
    })
  })

  const sortSelect = document.getElementById('sortSelect')
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      setState({ sortBy: sortSelect.value })
    })
  }

  const sortOrderBtn = document.getElementById('sortOrderBtn')
  if (sortOrderBtn) {
    sortOrderBtn.addEventListener('click', () => {
      const current = getState().sortOrder
      setState({ sortOrder: current === 'asc' ? 'desc' : 'asc' })
      sortOrderBtn.textContent = current === 'asc' ? '↓' : '↑'
    })
  }

  const searchInput = document.getElementById('searchInput')
  if (searchInput) {
    let debounceTimer
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setState({ searchQuery: searchInput.value })
      }, 200)
    })
  }
}

function setupDragDrop(containerEl) {
  let dragSrcId = null
  let touchDragEl = null
  let touchStartY = 0
  let touchStarted = false

  function persistOrder() {
    if (!dragSrcId) return
    const items = containerEl.querySelectorAll('.task-item')
    const ids = Array.from(items).map(el => Number(el.dataset.id))
    updateTaskOrder(ids).then(() => {
      return getAllTasks()
    }).then(all => {
      setState({ tasks: all })
    })
    dragSrcId = null
  }

  function findTaskItem(el) {
    return el.closest('.task-item')
  }

  containerEl.addEventListener('dragstart', (e) => {
    const item = findTaskItem(e.target)
    if (!item || !e.target.closest('.drag-handle')) {
      e.preventDefault()
      return
    }
    dragSrcId = item.dataset.id
    item.classList.add('dragging')
  })

  containerEl.addEventListener('dragover', (e) => {
    e.preventDefault()
    const target = findTaskItem(e.target)
    if (target && target.dataset.id !== dragSrcId) {
      const rect = target.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dragged = document.querySelector(`[data-id="${dragSrcId}"]`)
      if (e.clientY < mid) {
        containerEl.insertBefore(dragged, target)
      } else {
        containerEl.insertBefore(dragged, target.nextSibling)
      }
    }
  })

  containerEl.addEventListener('dragend', async () => {
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('dragging'))
    persistOrder()
  })

  let touchId = null

  containerEl.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('.drag-handle')
    if (!handle) return
    if (e.touches.length > 1) return

    const item = findTaskItem(e.target)
    if (!item) return

    touchDragEl = item
    dragSrcId = item.dataset.id
    touchStartY = e.touches[0].clientY
    touchStarted = false
    touchId = e.touches[0].identifier

    const rect = item.getBoundingClientRect()
    item.style.transition = 'none'
  }, { passive: true })

  containerEl.addEventListener('touchmove', (e) => {
    if (!touchDragEl || !dragSrcId) return

    const touch = Array.from(e.touches).find(t => t.identifier === touchId)
    if (!touch) return

    if (!touchStarted && Math.abs(touch.clientY - touchStartY) < 10) return
    touchStarted = true

    e.preventDefault()

    touchDragEl.style.opacity = '0.5'
    touchDragEl.style.borderStyle = 'dashed'

    const touchX = touch.clientX
    const touchY = touch.clientY

    const target = document.elementFromPoint(touchX, touchY)
    const targetItem = findTaskItem(target)

    if (targetItem && targetItem.dataset.id !== dragSrcId) {
      const rect = targetItem.getBoundingClientRect()
      const mid = rect.top + rect.height / 2

      if (touchY < mid) {
        containerEl.insertBefore(touchDragEl, targetItem)
      } else {
        containerEl.insertBefore(touchDragEl, targetItem.nextSibling)
      }
    }
  }, { passive: false })

  containerEl.addEventListener('touchend', (e) => {
    if (!touchDragEl || !dragSrcId) {
      touchDragEl = null
      touchStarted = false
      touchId = null
      return
    }

    touchDragEl.style.opacity = ''
    touchDragEl.style.borderStyle = ''
    touchDragEl.style.transition = ''

    touchDragEl = null
    touchStarted = false
    touchId = null
    persistOrder()
  })

  containerEl.addEventListener('touchcancel', () => {
    if (touchDragEl) {
      touchDragEl.style.opacity = ''
      touchDragEl.style.borderStyle = ''
      touchDragEl.style.transition = ''
    }
    touchDragEl = null
    dragSrcId = null
    touchStarted = false
    touchId = null
  })
}
