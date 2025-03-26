document.getElementById('parkingForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const carModel = document.getElementById('carModel').value.trim();
    const parkingDuration = document.getElementById('parkingDuration').value;
    const confidentialDetails = document.getElementById('confidentialDetails').value.trim();
    const resultDiv = document.getElementById('result');
    
    // Simulated parking space data
    const parkingSpaces = {
        sedan: 10,
        suv: 5,
        truck: 2
    };
    
    // Check availability based on car model
    let availableSpaces = 0;
    if (carModel.toLowerCase() in parkingSpaces) {
        availableSpaces = parkingSpaces[carModel.toLowerCase()];
    }
    
    if (availableSpaces > 0) {
        resultDiv.textContent = `Available spaces for ${carModel}: ${availableSpaces}. Duration: ${parkingDuration} hours.`;
    } else {
        resultDiv.textContent = `No available spaces for ${carModel}`;
    }

    // Log confidential details (in a real application, handle this securely)
    console.log(`Confidential Details: ${confidentialDetails}`);
});
