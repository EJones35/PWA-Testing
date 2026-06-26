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

        // CHECKBOX
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;

        checkbox.onchange = () => {
            tasks[index].done = checkbox.checked;
            saveTasks();
            renderTasks();
        };

        // TEXT
        const text = document.createElement("span");
        text.textContent = task.text;

        if (task.done) {
            text.style.textDecoration = "line-through";
            text.style.opacity = "0.6";
        }

        // EDIT
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.onclick = () => {
            const newTask = prompt("Edit task:", task.text);
            if (newTask && newTask.trim() !== "") {
                tasks[index].text = newTask.trim();
                saveTasks();
                renderTasks();
            }
        };

        // DELETE
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        };

        li.appendChild(checkbox);
        li.appendChild(text);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);

        list.appendChild(li);
    });
}

button.addEventListener("click", () => {
    if (input.value.trim() === "") return;

    tasks.push({
        text: input.value.trim(),
        done: false
    });

    input.value = "";

    saveTasks();
    renderTasks();
});

renderTasks();