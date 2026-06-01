from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

# Initialize ASGI App
app = FastAPI(title="Predictive Maintenance API")

# Allow requests from local HTML files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

rf_model = None

# Execute on server boot
@app.on_event("startup")
def load_model():
    global rf_model
    model_path = 'rf_model.joblib'
    if os.path.exists(model_path):
        rf_model = joblib.load(model_path)

# Pydantic Data Schema
class SensorData(BaseModel):
    features: list[float]

# Human-Readable Sensor Mapping Dictionary
FEATURE_NAMES = [
    "Setting 1 (Altitude)", "Setting 2 (Mach Number)", "Setting 3 (Throttle)",
    "Sensor 1 (Fan Inlet Temp)", "Sensor 2 (LPC Outlet Temp)", "Sensor 3 (HPC Outlet Temp)",
    "Sensor 4 (LPT Outlet Temp)", "Sensor 5 (Fan Inlet Pressure)", "Sensor 6 (Bypass-Duct Pressure)",
    "Sensor 7 (HPC Outlet Pressure)", "Sensor 8 (Physical Fan Speed)", "Sensor 9 (Physical Core Speed)",
    "Sensor 10 (Engine Pressure Ratio)", "Sensor 11 (Static Pressure HPC)", "Sensor 12 (Fuel Flow Ratio)",
    "Sensor 13 (Corrected Fan Speed)", "Sensor 14 (Corrected Core Speed)", "Sensor 15 (Bypass Ratio)",
    "Sensor 16 (Burner Fuel-Air Ratio)", "Sensor 17 (Bleed Enthalpy)", "Sensor 18 (Demanded Fan Speed)",
    "Sensor 19 (Demanded Corrected Fan)", "Sensor 20 (HPT Coolant Bleed)", "Sensor 21 (LPT Coolant Bleed)"
]

@app.post("/predict")
def predict_rul(data: SensorData):
    # Data Validation
    if len(data.features) != 24:
        raise HTTPException(status_code=400, detail="Expected 24 telemetry features.")

    # Matrix Reshaping
    input_array = np.array(data.features).reshape(1, -1)
    
    # 1. Execute Inference
    prediction = rf_model.predict(input_array)[0]
    rul_value = float(prediction)
    
    # 2. Extract Explainable AI (XAI) Metrics
    importances = rf_model.feature_importances_
    impacts = [{"sensor": FEATURE_NAMES[i], "impact": round(importances[i]*100, 2)} 
               for i in range(24)]
    
    # 3. Sort and Isolate Top 3 Root Causes
    top_3 = sorted(impacts, key=lambda x: x["impact"], reverse=True)[:3]

    # 4. Status Heuristics
    if rul_value > 80:
        status = "Healthy"
    elif rul_value > 30:
        status = "Warning"
    else:
        status = "Critical"

    # Compile JSON Response
    return {
        "predicted_RUL": round(rul_value, 2),
        "status": status,
        "top_driving_factors": top_3
    }