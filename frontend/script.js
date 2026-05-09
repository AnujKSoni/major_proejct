let telemetryChartInstance = null;
let xaiChartInstance = null;

// Helper to init charts on page load
document.addEventListener("DOMContentLoaded", () => {
    // Corrected 24-feature array for easy demoing
    const sampleInput = "-0.0007, -0.0004, 100.0, 518.67, 641.82, 1589.70, 1400.60, 14.62, 21.61, 554.36, 2388.06, 9046.19, 1.30, 47.47, 521.66, 2388.02, 8138.62, 8.4195, 0.03, 392, 2388, 100.00, 39.06, 23.419";
    document.getElementById('sensorData').value = sampleInput;
    
    // Draw empty placeholder charts
    drawTelemetryChart(Array(24).fill(0));
    drawXaiChart(["Awaiting Data", "Awaiting Data", "Awaiting Data"], [0, 0, 0]);
});

document.getElementById('predictBtn').addEventListener('click', async () => {
    const dataInput = document.getElementById('sensorData').value;
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    
    errorDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    try {
        const features = dataInput.split(',').map(val => parseFloat(val.trim()));
        if (features.length !== 24 || features.some(isNaN)) {
            throw new Error("Invalid Input: Please enter exactly 24 numerical values.");
        }

        // Draw the telemetry wave immediately
        drawTelemetryChart(features);

        // Fetch from Backend (CHANGE THIS URL IF USING NGROK FOR PRESENTATION)
        const response = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: features })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "API Communication Error");

        // --- UPDATE KPI CARDS ---
        document.getElementById('rulValue').innerText = result.predicted_RUL;
        document.getElementById('statusValue').innerText = result.status.toUpperCase();

        const statusCard = document.getElementById('statusCard');
        const rulCard = document.getElementById('rulCard');
        
        statusCard.className = 'card kpi-card'; rulCard.className = 'card kpi-card';
        if (result.status === 'Healthy') {
            statusCard.classList.add('status-healthy'); rulCard.classList.add('status-healthy');
        } else if (result.status === 'Warning') {
            statusCard.classList.add('status-warning'); rulCard.classList.add('status-warning');
        } else {
            statusCard.classList.add('status-critical'); rulCard.classList.add('status-critical');
        }

        // --- UPDATE XAI CHART ---
        const xaiLabels = result.top_driving_factors.map(f => f.sensor);
        const xaiData = result.top_driving_factors.map(f => f.impact_percentage);
        
        // Determine bar color based on engine status
        let barColor = 'rgba(56, 189, 248, 0.8)'; // default blue
        if (result.status === 'Warning') barColor = 'rgba(251, 191, 36, 0.8)'; // yellow
        if (result.status === 'Critical') barColor = 'rgba(239, 68, 68, 0.8)'; // red
        
        drawXaiChart(xaiLabels, xaiData, barColor);

        loadingDiv.classList.add('hidden');

    } catch (err) {
        loadingDiv.classList.add('hidden');
        errorDiv.innerText = err.message;
        errorDiv.classList.remove('hidden');
    }
});

// --- Chart.js Drawing Functions ---

function drawTelemetryChart(dataArray) {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    const labels = Array.from({length: 24}, (_, i) => `S${i+1}`);

    if (telemetryChartInstance) telemetryChartInstance.destroy();

    telemetryChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Raw Sensor Telemetry',
                data: dataArray,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#e2e8f0',
                fill: true,
                tension: 0.3 // Makes the line smooth and wave-like
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function drawXaiChart(labels, dataArray, barColor = 'rgba(56, 189, 248, 0.8)') {
    const ctx = document.getElementById('xaiChart').getContext('2d');

    if (xaiChartInstance) xaiChartInstance.destroy();

    xaiChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Impact Factor (%)',
                data: dataArray,
                backgroundColor: barColor,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Makes it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, max: 100 },
                y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 11 } } }
            }
        }
    });
}