const DB_NAME = 'OfflineTasksDB'
const DB_VERSION = 1
const STORE_NAME = 'tasks'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('completed', 'completed', { unique: false })
        store.createIndex('priority', 'priority', { unique: false })
        store.createIndex('archived', 'archived', { unique: false })
        store.createIndex('order', 'order', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB()
  return _db
}

export async function getAllTasks() {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addTask(task) {
  const db = await getDB()
  const now = new Date().toISOString()
  const newTask = {
    text: task.text,
    completed: false,
    priority: task.priority || 'medium',
    dueDate: task.dueDate || null,
    categories: task.categories || [],
    createdAt: now,
    updatedAt: now,
    archived: false,
    order: task.order || Date.now()
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(newTask)
    request.onsuccess = () => resolve({ ...newTask, id: request.result })
    request.onerror = () => reject(request.error)
  })
}

export async function updateTask(id, updates) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const task = getRequest.result
      if (!task) {
        reject(new Error('Task not found'))
        return
      }
      const updated = { ...task, ...updates, updatedAt: new Date().toISOString() }
      const putRequest = store.put(updated)
      putRequest.onsuccess = () => resolve(updated)
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function deleteTask(id) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteCompletedTasks() {
  const all = await getAllTasks()
  const completed = all.filter(t => t.completed && !t.archived)
  for (const task of completed) {
    await deleteTask(task.id)
  }
  return completed.length
}

export async function archiveCompletedTasks() {
  const all = await getAllTasks()
  const completed = all.filter(t => t.completed && !t.archived)
  for (const task of completed) {
    await updateTask(task.id, { archived: true })
  }
  return completed.length
}

export async function updateTaskOrder(ids) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  for (let i = 0; i < ids.length; i++) {
    const getRequest = store.get(ids[i])
    await new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const task = getRequest.result
        if (task) {
          task.order = i
          task.updatedAt = new Date().toISOString()
          store.put(task)
        }
        resolve()
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function importTasks(tasks) {
  for (const task of tasks) {
    await addTask(task)
  }
}

export async function exportTasks() {
  return await getAllTasks()
}
