document.getElementById('predictBtn').addEventListener('click', async () => {
    const dataInput = document.getElementById('sensorData').value;
    const rulCard = document.getElementById('rulCard');
    const rulValueDisplay = document.getElementById('rulValue');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    
    // UI Resets
    errorDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    rulValueDisplay.innerHTML = `-- <span class="unit">CYCLES</span>`;

    try {
        // Parse CSV string to array of floats (expecting 24 sensors)
        const features = dataInput.split(',').map(val => parseFloat(val.trim()));
        
        // Final Project Note: The API requires all 24 sensors in one comma-separated string for simplicity in this demo.
        if (features.length !== 24 || features.some(isNaN)) {
            throw new Error("Invalid Input: Please enter exactly 24 numerical values separated by commas (e.g., -0.0007, -0.0004, 100.0, ...).");
        }

        // Fetch from your *local* FastAPI backend (this URL remains the same)
        const response = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ features: features })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Prediction Engine Error: Failed to communicate with the local backend.");
        }

        // Update Dashboard UI with REAL data (only "Time to Failure")
        const predictedRUL = round(float(result.predicted_RUL), 2);
        rulValueDisplay.innerHTML = `${predictedRUL} <span class="unit">CYCLES</span>`;

        // Apply health status colors (healthy, warning, critical) dynamically to the card
        rulCard.className = 'card rul-card'; // reset status classes
        if (predictedRUL > 80) rulCard.classList.add('status-healthy');
        else if (predictedRUL > 30) rulCard.classList.add('status-warning');
        else rulCard.classList.add('status-critical');

        loadingDiv.classList.add('hidden');

    } catch (err) {
        loadingDiv.classList.add('hidden');
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
});

// Utility to round predictions
function float(str) {
    return parseFloat(str);
}
function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

// Provide a sample snapshot on load (from the dataset) to make testing easier
document.addEventListener("DOMContentLoaded", () => {
    // Example row from NASA Turbofan dataset FD001 (Engine 1, early cycle)
    const sampleInput = "20, -0.0007, -0.0004, 100.0, 518.67, 641.82, 1589.70, 1400.60, 14.62, 21.61, 554.36, 2388.06, 9046.19, 1.30, 47.47, 521.66, 2388.02, 8138.62, 8.4195, 0.03, 392, 2388, 100.00, 39.06, 23.419";
    document.getElementById('sensorData').value = sampleInput;
});