import json
import os
from typing import Optional, Dict, Any


class PatientService:
    def __init__(self, data_path: str = "data/patients.json"):
        self.data_path = data_path

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve patient by ID from JSON file."""
        try:
            if not os.path.exists(self.data_path):
                return None

            with open(self.data_path, "r") as f:
                patients = json.load(f)

            return next((p for p in patients if p["patient_id"] == patient_id), None)
        except (json.JSONDecodeError, FileNotFoundError):
            return None

    def get_all_patients(self) -> list:
        """Retrieve all patients."""
        try:
            with open(self.data_path, "r") as f:
                return json.load(f)
        except:
            return []
