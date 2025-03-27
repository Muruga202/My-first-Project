// Fetch parking spaces from the db.json file
async function fetchParkingSpaces() {
    const response = await fetch('http://localhost:3000/parkingSpaces');
    const spaces = await response.json();
    displayParkingSpaces(spaces);
}

// Display parking spaces
function displayParkingSpaces(spaces) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = ''; // Clear previous results

    spaces.forEach(space => {
        const spaceElement = document.createElement('div');
        spaceElement.textContent = `Space ID: ${space.id}, Model: ${space.carModel}, Available: ${space.availability}`;

        // Add a cancel button if the space is booked
        if (!space.availability) {
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel Booking';
            cancelButton.addEventListener('click', () => cancelBooking(space.id));
            spaceElement.appendChild(cancelButton);
        }

        resultElement.appendChild(spaceElement);
    });

    // Call the function to display remaining spots
    displayRemainingSpots(spaces);
}

// Display remaining parking spots
function displayRemainingSpots(spaces) {
    const availableSpaces = spaces.filter(space => space.availability).length;
    const messageElement = document.getElementById('message');
    messageElement.textContent = `Remaining Available Spots: ${availableSpaces}`;
}

// Handle form submission
document.getElementById('parkingForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const carModel = document.getElementById('carModel').value;
    const parkingDuration = document.getElementById('parkingDuration').value;

    const response = await fetch('http://localhost:3000/parkingSpaces');
    const spaces = await response.json();

    const availableSpace = spaces.find(space => space.carModel.toLowerCase() === carModel.toLowerCase() && space.availability);

    const availabilityStatus = document.getElementById('availabilityStatus');
    if (availableSpace) {
        availabilityStatus.textContent = `Parking space available for ${carModel}. Space ID: ${availableSpace.id}`;
        bookParking(availableSpace.id);
    } else {
        availabilityStatus.textContent = `No parking space available for ${carModel}.`;
    }
});

// Book a parking space
async function bookParking(spaceId) {
    await fetch(`http://localhost:3000/parkingSpaces/${spaceId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: false }),
    });

    fetchParkingSpaces();
}

// Cancel a booking
async function cancelBooking(spaceId) {
    await fetch(`http://localhost:3000/parkingSpaces/${spaceId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability: true }),
    });

    fetchParkingSpaces();
}

// Initial fetch of parking spaces
fetchParkingSpaces();