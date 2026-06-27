const input = document.getElementById("taskInput");
const button = document.getElementById("addButton");
const list = document.getElementById("taskList");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function createTask(task, completed = false) {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed;

    const text = document.createElement("span");
    text.textContent = task;

    if (completed) {
        text.style.textDecoration = "line-through";
        text.style.opacity = "0.6";
    }

    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            text.style.textDecoration = "line-through";
            text.style.opacity = "0.6";
        } else {
            text.style.textDecoration = "none";
            text.style.opacity = "1";
        }

        const index = tasks.findIndex(t => t.task === task);
        if (index !== -1) {
            tasks[index].completed = checkbox.checked;
            saveTasks();
        }
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "🗑️";

    deleteButton.addEventListener("click", () => {
        li.remove();

        tasks = tasks.filter(t => !(t.task === task && t.completed === checkbox.checked));
        saveTasks();
    });

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(deleteButton);

    list.appendChild(li);
}

button.addEventListener("click", () => {
    const task = input.value.trim();

    if (task === "") return;

    tasks.push({
        task: task,
        completed: false
    });

    saveTasks();
    createTask(task);

    input.value = "";
    input.focus();
});

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        button.click();
    }
});

// Load saved tasks
tasks.forEach(task => {
    createTask(task.task, task.completed);
});

// Register Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => console.log("Service Worker registered"))
            .catch(err => console.error("Service Worker registration failed:", err));
    });
}
