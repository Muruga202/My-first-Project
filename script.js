const totalSlots = 12;
let availableSlots = Array(totalSlots).fill(true);
const form = document.querySelector("#parking-form");
const tableBody = document.querySelector("#history tbody");
const slotsContainer = document.querySelector(".parking-slots");
const message = document.querySelector("#message");
const feedbackContainer = document.querySelector("#feedback-container");
const darkModeToggle = document.querySelector("#dark-mode-toggle");
const searchInput = document.querySelector("#search-input");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackTable = document.querySelector("#feedback-violations tbody");
let violationCount = 0;
let activeTimers = {};
const alarmSound = new Audio("sounds/alarm.mp3");

// Initialize the application
function initApp() {
    renderSlots();
    fetchTemperatureData();
    fetchWeatherData();
    fetchParkingViolations();
    
    // Request notification permissions
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

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

// Fetch Parking Violations (Mock Implementation)
async function fetchParkingViolations() {
    // This would normally be an API call, but we'll use mock data
    const mockData = [
        {
            plate: "KDA-389K",
            vehicle_make: "Toyota",
            issue_date: "2025-03-25",
            violation_description: "No Parking Zone",
            fine_amount: "Kshs 1,000/="
        },
        {
            plate: "KCX-342L",
            vehicle_make: "Honda",
            issue_date: "2025-03-27",
            violation_description: "Expired Meter",
            fine_amount: "Kshs 5000/="
        },
        {
            plate: "KDA-121G",
            vehicle_make: "Ford",
            issue_date: "2025-03-28",
            violation_description: "Double Parking",
            fine_amount: "Kshs 2,500/="
        }
    ];
    
    // Display the mock data
    displayParkingViolations(mockData);
}

// Render Parking Slots
function renderSlots() {
    slotsContainer.innerHTML = "";
    availableSlots.forEach((isAvailable, index) => {
        const slot = document.createElement("div");
        slot.classList.add("slot");
        if (!isAvailable) slot.classList.add("occupied");
        
        slot.textContent = `Slot ${index + 1}`;
        slotsContainer.appendChild(slot);
    });
}

// Handle Parking Submission with Enhanced Validation
form.addEventListener("submit", function (event) {
    event.preventDefault();
    
    const ownerName = document.querySelector("#owner-name").value;
    const carModel = document.querySelector("#car-model").value;
    const regNumber = document.querySelector("#car-reg").value;
    let duration = parseInt(document.querySelector("#duration").value, 10);
    const phoneNumber = document.querySelector("#phone-number").value;
    const vipCheck = document.querySelector("#vip-checkbox").checked;

    const regPattern = /^[A-Z]{3}-\d{3}[A-Z]$/;
    if (!regPattern.test(regNumber)) {
        alert("Please enter registration in format ABC-123A");
        return;
    }
    
    
    // Validate phone number (basic validation)
    if (!/^\d{10}$/.test(phoneNumber)) {
        alert("Please enter a valid 10-digit phone number");
        return;
    }
    
    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid positive number for duration.");
        return;
    }
    
    let slotIndex = availableSlots.indexOf(true);
    if (slotIndex === -1) {
        alert("No available slots.");
        return;
    }
    
    // If VIP, prioritize slots near entrance (assuming first slots are closer)
    if (vipCheck && slotIndex > 2) {
        // Try to find a VIP slot (first 3 slots)
        for (let i = 0; i < 3; i++) {
            if (availableSlots[i]) {
                slotIndex = i;
                break;
            }
        }
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
        <td>Spot ${slotIndex + 1}${vipCheck ? ' (VIP)' : ''}</td>
        <td>
            <button onclick="signOut(${slotIndex}, this)">Sign Out</button>
            <button class="delete-btn" onclick="deleteEntry(${slotIndex}, this)">Delete</button>
            <label><input type="checkbox" id="extend-${slotIndex}" onchange="extendTime(${slotIndex})"> Extend</label>
        </td>
    `;
    tableBody.appendChild(row);

    startCountdown(slotIndex, duration);
    renderSlots();
    form.reset();
    
    // Show browser notification
    if (Notification.permission === "granted") {
        new Notification("Parking Assigned", {
            body: `Your car has been assigned to Spot ${slotIndex + 1} for ${duration} minutes.`,
            icon: "parking-icon.png"
        });
    }
});

// Enhanced Countdown with Notifications
function startCountdown(slotIndex, duration) {
    let minutes = duration;
    let seconds = 0;
    
    // Notify when 5 minutes remain
    const notifyAt = 5; // minutes
    let notificationShown = false;

    activeTimers[slotIndex] = setInterval(() => {
        if (minutes === 0 && seconds === 0) {
            clearInterval(activeTimers[slotIndex]);
            availableSlots[slotIndex] = true;
            renderSlots();
            document.querySelector(`#timer-${slotIndex}`).textContent = "Expired";
            document.querySelector(`#timer-${slotIndex}`).style.color = "red";
            document.querySelector(`#timer-${slotIndex}`).style.fontWeight = "bold";

            // Use the blinkScreenRed function
            blinkScreenRed();
            
            // Play an alarm sound
            alarmSound.play();
            
            // Show browser notification
            if (Notification.permission === "granted") {
                new Notification("Parking Expired", {
                    body: `Parking in Slot ${slotIndex + 1} has expired!`,
                    icon: "parking-icon.png"
                });
            }
            
            return;
        }

        // Show notification when 5 minutes remain
        if (minutes === notifyAt && seconds === 0 && !notificationShown) {
            notificationShown = true;
            if (Notification.permission === "granted") {
                new Notification("Parking Almost Expired", {
                    body: `Only ${notifyAt} minutes remaining for Slot ${slotIndex + 1}!`,
                    icon: "parking-icon.png"
                });
            }
        }

        if (seconds === 0) {
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }

        const timerElement = document.querySelector(`#timer-${slotIndex}`);
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
            
            // Change color as time gets low
            if (minutes < 5) {
                timerElement.style.color = "orange";
            }
            if (minutes < 2) {
                timerElement.style.color = "red";
            }
        }
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
            
            // Reset background if dark mode isn't active
            if (!document.body.classList.contains("dark-mode")) {
                document.body.style.backgroundColor = "";
            }
        }
    }, 500);
}

// Extend Parking Time
function extendTime(slotIndex) {
    const extendCheckbox = document.querySelector(`#extend-${slotIndex}`);
    if (extendCheckbox.checked) {
        let additionalTime = prompt("Enter additional time in minutes:");
        additionalTime = parseInt(additionalTime, 10);
        if (!isNaN(additionalTime) && additionalTime > 0) {
            // Get current time values
            const timerElement = document.querySelector(`#timer-${slotIndex}`);
            const timeText = timerElement.textContent;
            let currentMinutes = 0;
            let currentSeconds = 0;
            
            if (timeText !== "Expired") {
                const timeParts = timeText.split(":");
                currentMinutes = parseInt(timeParts[0], 10);
                currentSeconds = parseInt(timeParts[1], 10);
            }
            
            // Calculate new total time
            const totalSeconds = (currentMinutes * 60 + currentSeconds) + (additionalTime * 60);
            const newMinutes = Math.floor(totalSeconds / 60);
            const newSeconds = totalSeconds % 60;
            
            // Reset timer
            clearInterval(activeTimers[slotIndex]);
            
            // Update display
            timerElement.textContent = `${newMinutes}:${newSeconds < 10 ? "0" : ""}${newSeconds}`;
            timerElement.style.color = ""; // Reset color
            
            // If slot was expired, make it occupied again
            if (availableSlots[slotIndex]) {
                availableSlots[slotIndex] = false;
                renderSlots();
            }
            
            // Start new countdown
            startCountdown(slotIndex, newMinutes, newSeconds);
        } else {
            alert("Invalid input. Extension not applied.");
        }
        extendCheckbox.checked = false; // Reset checkbox
    }
}

// Sign Out & Reset Slot
function signOut(slotIndex, button) {
    const now = new Date().toLocaleTimeString();
    button.closest("td").innerHTML = `Signed out at ${now}`;
    clearInterval(activeTimers[slotIndex]);
    availableSlots[slotIndex] = true;
    
    const timerElement = document.querySelector(`#timer-${slotIndex}`);
    if (timerElement) {
        timerElement.textContent = "Completed";
        timerElement.style.color = "green";
    }
    
    renderSlots();
}

// Delete Entry & Reset Slot
function deleteEntry(slotIndex, button) {
    if (confirm("Are you sure you want to delete this entry?")) {
        button.closest("tr").remove();
        clearInterval(activeTimers[slotIndex]);
        availableSlots[slotIndex] = true;
        renderSlots();
    }
}

// Dark Mode Toggle
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    
    // Save preference to localStorage
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);
});

// Load saved dark mode preference
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
}

// Search Filter for History
searchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    Array.from(tableBody.children).forEach(row => {
        const carModel = row.children[1].textContent.toLowerCase();
        const regNumber = row.children[2].textContent.toLowerCase();
        const ownerName = row.children[0].textContent.toLowerCase();
        
        // Search across multiple columns
        const matchesSearch = 
            carModel.includes(query) || 
            regNumber.includes(query) || 
            ownerName.includes(query);
            
        row.style.display = matchesSearch ? "" : "none";
    });
});

// Feedback Form Handler
feedbackForm.addEventListener("submit", function(event) {
    event.preventDefault();
    
    const plateNumber = document.querySelector("#plate-number").value;
    const feedback = document.querySelector("#feedback").value;
    const isNegative = document.querySelector("#negative-feedback-checkbox").checked;
    const currentTime = new Date().toLocaleTimeString();
    
    violationCount++;
    
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${violationCount}</td>
        <td>${plateNumber}</td>
        <td class="${isNegative ? 'negative-feedback' : ''}">${feedback}</td>
        <td>${currentTime}</td>
    `;
    
    feedbackTable.appendChild(row);
    feedbackForm.reset();
    
    // Show confirmation message
    feedbackContainer.textContent = "Thank you for your feedback!";
    feedbackContainer.style.color = "green";
    setTimeout(() => {
        feedbackContainer.textContent = "";
    }, 3000);
});

// Fetch Temperature Data with Error Handling
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
        // Display user-friendly error message
        const tableBody = document.querySelector("#temperatureDataTable tbody");
        tableBody.innerHTML = `<tr><td colspan="3">Unable to load temperature data. Please try again later.</td></tr>`;
    }
}

// Display Temperature Data
function displayTemperatureData(data) {
    const tableBody = document.querySelector("#temperatureDataTable tbody");
    tableBody.innerHTML = ""; // Clear existing data

    // Check if data has the expected structure
    if (data.items && data.items.length > 0 && data.items[0].readings) {
        data.items[0].readings.forEach(reading => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${reading.value || "N/A"}°C</td>
                <td>${new Date(data.items[0].timestamp).toLocaleString() || "N/A"}</td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        // If API returns unexpected format, use mock data
        const mockData = [
            { temperature: "28.5°C", timestamp: new Date().toLocaleString() },
            { temperature: "27.8°C", timestamp: new Date().toLocaleString() }
        ];
        
        mockData.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.station}</td>
                <td>${item.temperature}</td>
                <td>${item.timestamp}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

// Fetch Weather Data with Error Handling
async function fetchWeatherData() {
    const apiUrl = "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&daily=temperature_2m_max,temperature_2m_min&timezone=GMT";

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
        displayWeatherData(data.daily);
    } catch (error) {
        console.error("Error fetching weather data:", error);
        
        // Display mock data on error
        const mockWeatherData = {
            time: ["2025-03-30", "2025-03-31", "2025-04-01", "2025-04-02", "2025-04-03"],
            temperature_2m_max: [22.5, 23.1, 21.8, 20.5, 22.0],
            temperature_2m_min: [15.2, 14.8, 13.9, 14.2, 15.5]
        };
        
        displayWeatherData(mockWeatherData);
    }
}

// Display Weather Data
function displayWeatherData(dailyData) {
    const weatherTableBody = document.querySelector("#weather-table tbody");
    weatherTableBody.innerHTML = ""; // Clear existing data

    if (dailyData && dailyData.time) {
        dailyData.time.forEach((date, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${date}</td>
                <td>${dailyData.temperature_2m_max[index]}°C</td>
                <td>${dailyData.temperature_2m_min[index]}°C</td>
            `;
            weatherTableBody.appendChild(row);
        });
    } else {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="3">No weather data available</td>`;
        weatherTableBody.appendChild(row);
    }
}

// Export parking data to CSV
function exportToCsv() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Owner Name,Car Model,Registration,Time Left,Phone Number,Slot\n";
    
    Array.from(tableBody.children).forEach(row => {
        const ownerName = row.children[0].textContent;
        const carModel = row.children[1].textContent;
        const regNumber = row.children[2].textContent;
        const timeLeft = row.children[3].textContent;
        const phoneNumber = row.children[4].textContent;
        const slot = row.children[5].textContent;
        
        csvContent += `"${ownerName}","${carModel}","${regNumber}","${timeLeft}","${phoneNumber}","${slot}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `parking_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add export button to UI
function addExportButton() {
    const exportButton = document.createElement("button");
    exportButton.textContent = "Export Parking Data";
    exportButton.classList.add("export-button");
    exportButton.addEventListener("click", exportToCsv);
    
    // Insert after search container
    const searchContainer = document.querySelector(".search-container");
    searchContainer.parentNode.insertBefore(exportButton, searchContainer.nextSibling);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    addExportButton();
});
