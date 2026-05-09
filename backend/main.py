from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os

# Initialize FastAPI App
app = FastAPI(
    title="Predictive Maintenance Engine API",
    description="Backend API for NASA Turbofan RUL Prediction with Explainable AI",
    version="2.0.0"
)

# Allow your Vercel frontend (and Ngrok) to talk to this local server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to hold the model
rf_model = None

@app.on_event("startup")
def load_model():
    global rf_model
    model_path = 'rf_model.joblib'
    if os.path.exists(model_path):
        rf_model = joblib.load(model_path)
        print("Machine Learning Model loaded successfully.")
    else:
        print("WARNING: rf_model.joblib not found. Please run train_export.py first.")

# Define the exact data structure expected from the frontend
class SensorData(BaseModel):
    features: list[float]

# Official NASA CMAPSS Feature Mapping for Explainable AI
FEATURE_NAMES = [
    "Setting 1 (Altitude)", "Setting 2 (Mach Number)", "Setting 3 (Throttle Resolver)",
    "Sensor 1 (Fan Inlet Temp)", "Sensor 2 (LPC Outlet Temp)", "Sensor 3 (HPC Outlet Temp)",
    "Sensor 4 (LPT Outlet Temp)", "Sensor 5 (Fan Inlet Pressure)", "Sensor 6 (Bypass-Duct Pressure)",
    "Sensor 7 (HPC Outlet Pressure)", "Sensor 8 (Physical Fan Speed)", "Sensor 9 (Physical Core Speed)",
    "Sensor 10 (Engine Pressure Ratio)", "Sensor 11 (Static Pressure HPC)", "Sensor 12 (Fuel Flow Ratio)",
    "Sensor 13 (Corrected Fan Speed)", "Sensor 14 (Corrected Core Speed)", "Sensor 15 (Bypass Ratio)",
    "Sensor 16 (Burner Fuel-Air Ratio)", "Sensor 17 (Bleed Enthalpy)", "Sensor 18 (Demanded Fan Speed)",
    "Sensor 19 (Demanded Corrected Fan Speed)", "Sensor 20 (HPT Coolant Bleed)", "Sensor 21 (LPT Coolant Bleed)"
]

@app.get("/")
def health_check():
    return {"status": "API is running. XAI Model loaded: " + str(rf_model is not None)}

@app.post("/predict")
def predict_rul(data: SensorData):
    if rf_model is None:
        raise HTTPException(status_code=500, detail="Prediction model is offline.")
    
    if len(data.features) != 24:
        raise HTTPException(
            status_code=400, 
            detail=f"Data shape mismatch. Expected 24 features, got {len(data.features)}."
        )

    try:
        # Reshape data for Scikit-Learn
        input_array = np.array(data.features).reshape(1, -1)
        
        # 1. Execute Prediction
        prediction = rf_model.predict(input_array)[0]
        rul_value = float(prediction)
        
        # 2. Extract Feature Importance (Explainable AI)
        importances = rf_model.feature_importances_
        
        # Pair each feature name with its importance score
        impacts = []
        for i in range(24):
            impacts.append({
                "sensor": FEATURE_NAMES[i],
                "impact_percentage": round(float(importances[i]) * 100, 2)
            })
            
        # Sort by impact percentage (highest first) and grab the top 3
        top_3_causes = sorted(impacts, key=lambda x: x["impact_percentage"], reverse=True)[:3]

        # 3. Status logic
        if rul_value > 80:
            status = "Healthy"
        elif rul_value > 30:
            status = "Warning"
        else:
            status = "Critical"

        # Return the upgraded JSON response
        return {
            "predicted_RUL": round(rul_value, 2),
            "status": status,
            "top_driving_factors": top_3_causes,
            "message": "Prediction and XAI analysis executed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction processing error: {str(e)}")