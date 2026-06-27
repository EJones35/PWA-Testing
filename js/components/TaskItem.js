import { updateTask, deleteTask } from '../db.js'
import { setState, getState } from '../state.js'

const PRIORITY_LABELS = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' }

export function createTaskElement(task) {
  const li = document.createElement('li')
  li.className = `task-item priority-${task.priority}`
  if (task.completed) li.classList.add('completed')
  li.dataset.id = task.id

  li.innerHTML = `
    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
    <div class="task-body">
      <div class="task-text">${escapeHtml(task.text)}</div>
      <div class="task-meta">
        ${PRIORITY_LABELS[task.priority] || '🟡 Medium'}
        ${task.dueDate ? ` · <span class="task-due ${isOverdue(task.dueDate) && !task.completed ? 'overdue' : ''}">📅 ${formatDate(task.dueDate)}</span>` : ''}
        ${task.categories && task.categories.length ? ` · ${task.categories.map(c => `<span class="task-category">${escapeHtml(c)}</span>`).join(' ')}` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn edit-btn" title="Edit">✏️</button>
      <button class="icon-btn delete-btn" title="Delete">🗑️</button>
    </div>
  `

  const checkbox = li.querySelector('.task-checkbox')
  const taskText = li.querySelector('.task-text')
  const editBtn = li.querySelector('.edit-btn')
  const deleteBtn = li.querySelector('.delete-btn')

  checkbox.addEventListener('change', async () => {
    const completed = checkbox.checked
    li.classList.toggle('completed', completed)
    await updateTask(task.id, { completed })
    await refreshTasks()
  })

  deleteBtn.addEventListener('click', async () => {
    li.classList.add('removing')
    setTimeout(async () => {
      await deleteTask(task.id)
      await refreshTasks()
    }, 250)
  })

  editBtn.addEventListener('click', () => {
    startEditing(li, task, taskText)
  })

  li.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id)
    li.classList.add('dragging')
  })

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging')
  })

  return li
}

function startEditing(li, task, taskTextEl) {
  const currentText = task.text
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'edit-input'
  input.value = currentText

  const prioritySelect = document.createElement('select')
  prioritySelect.className = 'edit-priority'
  ;['low', 'medium', 'high'].forEach(p => {
    const opt = document.createElement('option')
    opt.value = p
    opt.textContent = p.charAt(0).toUpperCase() + p.slice(1)
    if (p === task.priority) opt.selected = true
    prioritySelect.appendChild(opt)
  })

  const dateInput = document.createElement('input')
  dateInput.type = 'date'
  dateInput.className = 'edit-date'
  dateInput.value = task.dueDate ? task.dueDate.split('T')[0] : ''

  const saveBtn = document.createElement('button')
  saveBtn.className = 'save-edit-btn'
  saveBtn.textContent = 'Save'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'cancel-edit-btn'
  cancelBtn.textContent = 'Cancel'

  const editGroup = document.createElement('div')
  editGroup.className = 'edit-group'
  editGroup.append(input, prioritySelect, dateInput, saveBtn, cancelBtn)

  taskTextEl.replaceWith(editGroup)
  input.focus()

  const cleanup = async (save) => {
    if (save) {
      const text = input.value.trim()
      if (text) {
        const dueDate = dateInput.value || null
        await updateTask(task.id, {
          text,
          priority: prioritySelect.value,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null
        })
        await refreshTasks()
      }
    } else {
      await refreshTasks()
    }
  }

  saveBtn.addEventListener('click', () => cleanup(true))
  cancelBtn.addEventListener('click', () => cleanup(false))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cleanup(true)
    if (e.key === 'Escape') cleanup(false)
  })
}

async function refreshTasks() {
  const { getAllTasks } = await import('../db.js')
  const tasks = await getAllTasks()
  setState({ tasks })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}
