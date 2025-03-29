const totalSlots = 12;
let availableSlots = Array(totalSlots).fill(true);
const form = document.querySelector("#parking-form");
const tableBody = document.querySelector("#history tbody");
const slotsContainer = document.querySelector(".parking-slots");
const message = document.querySelector("#message");
const feedbackContainer = document.querySelector("#feedback-container");
const darkModeToggle = document.querySelector("#dark-mode-toggle");
let activeTimers = {};
const alarmSound = new Audio("alarm.mp3");

// Display Parking Violations in Table
function displayParkingViolations(data) {
    const tableBody = document.querySelector("#nycViolationsTable tbody");
    tableBody.innerHTML = ""; // Clear existing data

    data.forEach(violation => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${violation.plate || "N/A"}</td>
            <td>${violation.vehicle_make || "Unknown"}</td>
            <td>${violation.issue_date || "N/A"}</td>
            <td>${violation.violation_description || "N/A"}</td>
            <td>${violation.fine_amount || "N/A"}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Render Parking Slots
function renderSlots() {
    slotsContainer.innerHTML = "";
    availableSlots.forEach((isAvailable, index) => {
        const slot = document.createElement("div");
        slot.classList.add("slot");
        if (!isAvailable) slot.classList.add("occupied");
        
        slot.append(`Slot ${index + 1}`);
        slotsContainer.appendChild(slot);
    });
}

// Handle Parking Submission
form.addEventListener("submit", function (event) {
    event.preventDefault();
    
    let slotIndex = availableSlots.indexOf(true);
    if (slotIndex === -1) {
        alert("No available slots.");
        return;
    }
    
    const ownerName = document.querySelector("#owner-name").value;
    const carModel = document.querySelector("#car-model").value;
    const regNumber = document.querySelector("#car-reg").value;
    let duration = parseInt(document.querySelector("#duration").value, 10);
    const phoneNumber = document.querySelector("#phone-number").value;
    const vipCheck = document.querySelector("#vip-checkbox").checked;

    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid positive number for duration.");
        return;
    }
    
    availableSlots[slotIndex] = false;
    message.textContent = `Spot ${slotIndex + 1} assigned!`;
    message.style.color = "green";

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${ownerName}</td>
        <td>${carModel}</td>
        <td>${regNumber}</td>
        <td id="timer-${slotIndex}">${duration}:00</td>
        <td>${phoneNumber}</td>
        <td>Spot ${slotIndex + 1}</td>
        <td>
            <button onclick="signOut(${slotIndex}, this)">Sign Out</button>
            <button class="delete-btn" onclick="deleteEntry(${slotIndex}, this)">Delete</button>
        </td>
    `;
    tableBody.appendChild(row);

    startCountdown(slotIndex, duration);
    renderSlots();
    form.reset();
});


function startCountdown(slotIndex, duration) {
    let minutes = duration;
    let seconds = 0;

    activeTimers[slotIndex] = setInterval(() => {
        if (minutes === 0 && seconds === 0) {
            clearInterval(activeTimers[slotIndex]);
            availableSlots[slotIndex] = true;
            renderSlots();
            document.querySelector(`#timer-${slotIndex}`).textContent = "Expired";

            // 🔴 Change the background color to red
            document.body.style.backgroundColor = "red";

            // 🔔 Play an alarm sound (Optional)
            alarmSound.play();

            // 🕒 Reset the background color after 3 seconds
            setTimeout(() => {
                document.body.style.backgroundColor = "";
            }, 3000);
            
            return;
        }

        if (seconds === 0) {
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }

        document.querySelector(`#timer-${slotIndex}`).textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }, 1000);
}
// Blinking Red Effect When Time Expires
function blinkScreenRed() {
    let blinkCount = 0;
    const interval = setInterval(() => {
        document.body.style.backgroundColor = blinkCount % 2 === 0 ? "red" : "";
        blinkCount++;
        if (blinkCount === 6) {
            clearInterval(interval);
        }
    }, 500);
}

// Extend Parking Time
function extendTime(slotIndex) {
    const extendCheckbox = document.querySelector(`#extend-${slotIndex}`);
    if (extendCheckbox.checked) {
        alarmSound.play();
        clearInterval(activeTimers[slotIndex]);
        let additionalTime = prompt("Enter additional time in minutes:");
        additionalTime = parseInt(additionalTime, 10);
        if (!isNaN(additionalTime) && additionalTime > 0) {
            startCountdown(slotIndex, additionalTime);
        } else {
            alert("Invalid input. Extension not applied.");
        }
    }
}

// Sign Out & Reset Slot
function signOut(slotIndex, button) {
    const now = new Date().toLocaleTimeString();
    button.parentElement.innerHTML = `Signed out at ${now}`;
    clearInterval(activeTimers[slotIndex]);
    availableSlots[slotIndex] = true;
    renderSlots();
}

// Delete Entry & Reset Slot
function deleteEntry(slotIndex, button) {
    button.closest("tr").remove();
    clearInterval(activeTimers[slotIndex]);
    availableSlots[slotIndex] = true;
    renderSlots();
}

// Dark Mode Toggle
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// Search Filter for History
searchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    Array.from(tableBody.children).forEach(row => {
        const carModel = row.children[1].textContent.toLowerCase();
        row.style.display = carModel.includes(query) ? "" : "none";
    });
});

async function fetchTemperatureData() {
    try {
        const response = await fetch('https://api.data.gov.sg/v1/environment/air-temperature');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayTemperatureData(data);
    } catch (error) {
        console.error("Error fetching temperature data:", error);
    }
}

function displayTemperatureData(data) {
    const tableBody = document.querySelector("#temperatureDataTable tbody");
    tableBody.innerHTML = ""; // Clear existing data

    data.forEach(record => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${record.date || "N/A"}</td>
            <td>${record.temperature || "N/A"}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Call the function to fetch and display data
fetchTemperatureData();

async function fetchWeatherData() {
    const apiUrl = "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&daily=temperature_2m_max,temperature_2m_min&timezone=GMT";

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
        console.log("Weather Data:", data);
        displayWeatherData(data.daily);
    } catch (error) {
        console.error("Error fetching weather data:", error);
    }
}
function displayWeatherData(dailyData) {
    const weatherTableBody = document.querySelector("#weather-table tbody");
    weatherTableBody.innerHTML = ""; // Clear existing data

    dailyData.time.forEach((date, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${date}</td>
            <td>${dailyData.temperature_2m_max[index]}°C</td>
            <td>${dailyData.temperature_2m_min[index]}°C</td>
        `;
        weatherTableBody.appendChild(row);
    });
}