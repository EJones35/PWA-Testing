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

  if (tasks.length > 0) {
    const bulkEl = document.createElement('li')
    bulkEl.className = 'bulk-actions'
    bulkEl.innerHTML = `
      <span>${tasks.filter(t => t.completed).length} completed</span>
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

    const sortControls = document.querySelector('.sort-controls')
    const count = tasks.filter(t => !t.completed).length
    if (sortControls) {
      sortControls.querySelector('.task-count').textContent = `${count} task${count !== 1 ? 's' : ''}`
    }
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

  containerEl.addEventListener('dragstart', (e) => {
    dragSrcId = e.target.closest('.task-item')?.dataset.id
  })

  containerEl.addEventListener('dragover', (e) => {
    e.preventDefault()
    const target = e.target.closest('.task-item')
    if (target && target.dataset.id !== dragSrcId) {
      const rect = target.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if (e.clientY < mid) {
        containerEl.insertBefore(
          document.querySelector(`[data-id="${dragSrcId}"]`),
          target
        )
      } else {
        containerEl.insertBefore(
          document.querySelector(`[data-id="${dragSrcId}"]`),
          target.nextSibling
        )
      }
    }
  })

  containerEl.addEventListener('dragend', async () => {
    if (!dragSrcId) return
    const items = containerEl.querySelectorAll('.task-item')
    const ids = Array.from(items).map(el => Number(el.dataset.id))
    await updateTaskOrder(ids)
    const all = await getAllTasks()
    setState({ tasks: all })
    dragSrcId = null
  })
}
