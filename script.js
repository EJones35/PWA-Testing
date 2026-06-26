const input = document.getElementById("taskInput");
const button = document.getElementById("addButton");
const list = document.getElementById("taskList");

button.addEventListener("click", () => {
    if (input.value === "")
        return;
    const li = document.createElement("li");
    li.textContent = input.value;
    list.appendChild(li);
    input.value = "";
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}