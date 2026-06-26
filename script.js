const input = document.getElementById("taskInput");
const button = document.getElementById("addButton");
const list = document.getElementById("taskList");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function renderTasks() {
    list.innerHTML = "";

    tasks.forEach((task, index) => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.textContent = task;

        // EDIT button
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.onclick = () => {
            const newTask = prompt("Edit task:", task);
            if (newTask && newTask.trim() !== "") {
                tasks[index] = newTask.trim();
                saveTasks();
                renderTasks();
            }
        };

        // DELETE button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        };

        li.appendChild(text);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        list.appendChild(li);
    });
}

button.addEventListener("click", () => {
    if (input.value.trim() === "") return;

    tasks.push(input.value.trim());
    input.value = "";

    saveTasks();
    renderTasks();
});

// initial load
renderTasks();