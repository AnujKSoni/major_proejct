import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def build_and_export_model():
    data_file = 'train_FD001.txt'
    
    if not os.path.exists(data_file):
        print(f"ERROR: '{data_file}' not found in the current directory.")
        print("Please download the NASA CMAPSS dataset (train_FD001.txt) and place it here.")
        return

    print("Loading NASA Turbofan Dataset...")
    
    # Define column names as per the CMAPSS dataset structure
    columns = ['unit_number', 'time_in_cycles', 'setting_1', 'setting_2', 'setting_3']
    columns += [f'sensor_{i}' for i in range(1, 22)]
    
    # Load data
    df = pd.read_csv(data_file, sep='\s+', header=None, names=columns)

    print("Calculating Remaining Useful Life (RUL) for training...")
    # Find the maximum cycles for each engine unit
    rul_data = pd.DataFrame(df.groupby('unit_number')['time_in_cycles'].max()).reset_index()
    rul_data.columns = ['unit_number', 'max_cycles']
    
    # Merge back to the main dataset to calculate RUL per row
    df = df.merge(rul_data, on=['unit_number'], how='left')
    df['RUL'] = df['max_cycles'] - df['time_in_cycles']
    
    # Drop columns that are not predictive features (unit number, time in cycles, and the max_cycles we just used)
    # This leaves exactly 24 features (3 settings + 21 sensors) matching your frontend
    X_train = df.drop(columns=['unit_number', 'time_in_cycles', 'max_cycles', 'RUL'])
    y_train = df['RUL']

    print(f"Training Random Forest Regressor on {len(X_train)} data points...")
    print("This may take a minute depending on your local machine...")
    
    # Initialize and train the model (Matching the repository's chosen algorithm)
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # Export the trained model
    model_filename = 'rf_model.joblib'
    joblib.dump(model, model_filename)
    
    print(f"SUCCESS! Model fully trained and saved as '{model_filename}'")
    print("You can now start your FastAPI server.")

if __name__ == "__main__":
    build_and_export_model()