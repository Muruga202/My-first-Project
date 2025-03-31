// Global variables
let parkingSlots = [];
const TOTAL_SLOTS = 20;
let timerIntervals = {};
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initializeParkingSystem();
    loadParkingData();
    setupEventListeners();
    requestNotificationPermission();
});

// Initialize parking system
function initializeParkingSystem() {
    const parkingSlotsContainer = document.querySelector('.parking-slots');
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const row = String.fromCharCode(65 + Math.floor((i-1)/4));
        const number = ((i-1) % 4) + 1;
        const slotId = `${row}${number}`;
        
        const slot = createSlotElement(slotId);
        parkingSlotsContainer.appendChild(slot);
        parkingSlots.push({
            id: slotId,
            status: 'available',
            licenseId: null,
            checkInTime: null,
            duration: null
        });
    }
}

// Create slot element
function createSlotElement(slotId) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.id = `slot-${slotId}`;
    slot.innerHTML = `
        <div class="slot-id">${slotId}</div>
        <div class="timer-display"></div>
        <div class="vehicle-info"></div>
    `;
    return slot;
}

// Load parking data from JSON server
async function loadParkingData() {
    try {
        const response = await fetch('http://localhost:3000/parkingSlots');
        const data = await response.json();
        updateParkingDisplay(data);
    } catch (error) {
        console.error('Error loading parking data:', error);
        showMessage('Failed to load parking data', 'error');
    }
}

// Update parking display
function updateParkingDisplay(slots) {
    slots.forEach(slot => {
        const slotElement = document.querySelector(`#slot-${slot.id}`);
        if (slotElement) {
            slotElement.className = `slot ${slot.status}`;
            if (slot.status === 'occupied') {
                updateSlotInfo(slot);
                startTimer(slot.id, slot.duration);
            }
        }
    });
}

// Handle parking form submission
async function handleParkingSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const parkingData = {
        licenseId: formData.get('license'),
        vehicleType: formData.get('vehicle-type'),
        duration: parseInt(formData.get('duration')),
        isVIP: formData.get('vip') === 'on'
    };

    try {
        const slot = await assignParkingSlot(parkingData);
        if (slot) {
            showMessage(`Parking slot ${slot.id} assigned successfully`, 'success');
            updateParkingDisplay([slot]);
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Assign parking slot
async function assignParkingSlot(parkingData) {
    const availableSlot = parkingSlots.find(slot => slot.status === 'available');
    if (!availableSlot) {
        throw new Error('No parking slots available');
    }

    const updatedSlot = {
        ...availableSlot,
        status: 'occupied',
        licenseId: parkingData.licenseId,
        checkInTime: new Date().toISOString(),
        duration: parkingData.duration
    };

    try {
        const response = await fetch(`http://localhost:3000/parkingSlots/${updatedSlot.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSlot)
        });
        return await response.json();
    } catch (error) {
        throw new Error('Failed to assign parking slot');
    }
}

// Add these new timer-related functions after your existing timer functions

function formatTimeLeft(timeLeft) {
    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update the existing startTimer function
function startTimer(slotId, duration) {
    if (timerIntervals[slotId]) {
        clearInterval(timerIntervals[slotId]);
    }

    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + duration);

    const timerDisplay = document.querySelector(`#slot-${slotId} .timer-display`);
    if (timerDisplay) {
        timerDisplay.classList.add('active-timer');
    }

    function updateTimer() {
        const now = new Date();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            handleTimerExpiration(slotId);
        } else {
            updateTimerDisplay(slotId, timeLeft);
            
            // Warning when 5 minutes remaining
            if (timeLeft <= 300000 && timeLeft > 299000) { // 5 minutes
                showNotification(`⚠️ 5 minutes remaining for slot ${slotId}`);
                timerDisplay.classList.add('warning');
            }
            // Critical warning when 1 minute remaining
            if (timeLeft <= 60000 && timeLeft > 59000) { // 1 minute
                showNotification(`🚨 1 minute remaining for slot ${slotId}`);
                timerDisplay.classList.add('critical');
                playWarningBeep();
            }
        }
    }

    // Initial update
    updateTimer();
    // Update every second
    timerIntervals[slotId] = setInterval(updateTimer, 1000);
}

// Update the existing updateTimerDisplay function
function updateTimerDisplay(slotId, timeLeft) {
    const timerDisplay = document.querySelector(`#slot-${slotId} .timer-display`);
    if (timerDisplay) {
        timerDisplay.textContent = formatTimeLeft(timeLeft);
        
        // Add visual indicator for remaining time
        const percentageLeft = (timeLeft / (timerIntervals[slotId].initialDuration * 60000)) * 100;
        timerDisplay.style.background = `linear-gradient(to right, #4CAF50 ${percentageLeft}%, #ff6b6b ${percentageLeft}%)`;
    }
}

// Update the existing handleTimerExpiration function
function handleTimerExpiration(slotId) {
    clearInterval(timerIntervals[slotId]);
    const slot = document.querySelector(`#slot-${slotId}`);
    const timerDisplay = slot?.querySelector('.timer-display');
    
    if (slot && timerDisplay) {
        slot.classList.add('expired');
        timerDisplay.textContent = 'EXPIRED';
        timerDisplay.classList.remove('active-timer', 'warning', 'critical');
        timerDisplay.classList.add('expired');
        
        // Play alarm sound
        playAlarmSound();
        
        // Show notification
        showNotification(`🚫 Parking time has EXPIRED for slot ${slotId}`);
        
        // Flash the slot
        flashExpiredSlot(slot);
    }
}

// Add these new utility functions
function playWarningBeep() {
    const beep = new Audio('sounds/warning-beep.mp3');
    beep.volume = 0.5;
    beep.play().catch(error => console.error('Error playing warning beep:', error));
}

function flashExpiredSlot(slot) {
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        slot.classList.toggle('flash');
        flashCount++;
        
        if (flashCount >= 10) { // Flash 5 times (10 toggles)
            clearInterval(flashInterval);
            slot.classList.add('expired');
            slot.classList.remove('flash');
        }
    }, 500); // Toggle every 500ms
}

// Add this CSS to your stylesheet
// Utility functions
function showMessage(message, type = 'info') {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = type;
    setTimeout(() => {
        messageElement.textContent = '';
        messageElement.className = '';
    }, 3000);
}

async function requestNotificationPermission() {
    if ('Notification' in window) {
        await Notification.requestPermission();
    }
}

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Smart Parking System', { body: message });
    }
}

function playAlarmSound() {
    const audio = new Audio('sounds/alarm.mp3');
    audio.play().catch(error => console.error('Error playing sound:', error));
}

// Dark mode toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Event listeners setup
function setupEventListeners() {
    document.getElementById('parking-form').addEventListener('submit', handleParkingSubmit);
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    document.getElementById('search-input').addEventListener('input', handleSearch);
}

// Search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const slots = document.querySelectorAll('.slot');
    
    slots.forEach(slot => {
        const vehicleInfo = slot.querySelector('.vehicle-info').textContent.toLowerCase();
        if (vehicleInfo.includes(searchTerm) || slot.id.toLowerCase().includes(searchTerm)) {
            slot.style.display = 'block';
        } else {
            slot.style.display = 'none';
        }
    });
}

// Initialize dark mode from localStorage
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}