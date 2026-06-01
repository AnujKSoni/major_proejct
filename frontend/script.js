// Chart instances to prevent canvas overlap glitches
let telemetryChartInstance = null;
let xaiChartInstance = null;

document.getElementById('predictBtn').addEventListener('click', async () => {
    const btn = document.getElementById('predictBtn');
    const dataInput = document.getElementById('sensorData').value;
    const features = dataInput.split(',').map(val => parseFloat(val.trim()));

    // --- IMPORTANT: UPDATE THIS URL ---
    // Change this to your current Ngrok HTTPS forwarding URL
    const API_URL = 'https://YOUR_NGROK_URL_HERE.ngrok-free.app/predict';

    if (features.length !== 24 || features.includes(NaN)) {
        alert("Error: Please provide exactly 24 valid numerical sensor readings.");
        return;
    }

    // UI Loading State
    btn.innerText = "Analyzing Telemetry...";
    btn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: features })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const result = await response.json();
        
        // Update DOM Text
        document.getElementById('rulValue').innerText = result.predicted_RUL;
        
        // Update Status Badge Color
        const statusEl = document.getElementById('statusValue');
        statusEl.innerText = result.status.toUpperCase();
        
        if (result.status === "Healthy") {
            statusEl.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
            statusEl.style.color = "#10b981";
        } else if (result.status === "Warning") {
            statusEl.style.backgroundColor = "rgba(245, 158, 11, 0.2)";
            statusEl.style.color = "#f59e0b";
        } else {
            statusEl.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            statusEl.style.color = "#ef4444";
        }

        // Draw the Charts
        drawTelemetryChart(features);
        
        const xaiLabels = result.top_driving_factors.map(f => f.sensor);
        const xaiData = result.top_driving_factors.map(f => f.impact);
        drawXaiChart(xaiLabels, xaiData);

    } catch (error) {
        console.error("API Communication Error:", error);
        alert("Failed to connect to the backend. Is Ngrok running?");
    } finally {
        // Reset Button
        btn.innerText = "Run Diagnostic Prediction";
        btn.disabled = false;
    }
});

// Render the 24-sensor wave
function drawTelemetryChart(features) {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    
    // Destroy previous chart if it exists to prevent overlap
    if (telemetryChartInstance) telemetryChartInstance.destroy();

    const labels = Array.from({length: 24}, (_, i) => `S${i+1}`);

    telemetryChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Normalized Sensor Output',
                data: features,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// Render the Root Cause Analysis Bar Chart
function drawXaiChart(labels, data) {
    const ctx = document.getElementById('xaiChart').getContext('2d');
    
    if (xaiChartInstance) xaiChartInstance.destroy();

    xaiChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Impact Factor (%)',
                data: data,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',  // Red for highest impact
                    'rgba(245, 158, 11, 0.8)', // Orange
                    'rgba(16, 185, 129, 0.8)'  // Green
                ],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', // Makes it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 11 } } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, max: 100 }
            }
        }
    });
}