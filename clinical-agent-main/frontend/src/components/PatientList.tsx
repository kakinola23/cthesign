import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, Patient } from '../services/api';
import './PatientList.css';

const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState<boolean>(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiService.importPatients(file, overwrite);
      setSuccess(result.message);
      // Refresh patient list after upload
      await fetchPatients();
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to upload patients file';
      setError(errorMessage);
      console.error('Error uploading patients:', err);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPatients();
      setPatients(data);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load patients. Please ensure the backend server is running on http://localhost:8000';
      setError(errorMessage);
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await apiService.exportPatients();
      const blob = new Blob([JSON.stringify(data.patients, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`Exported ${data.count} patients`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to export patients';
      setError(errorMessage);
      console.error('Error exporting patients:', err);
    }
  };

  const handleAssess = (patientId: string) => {
    navigate(`/assess/${patientId}`);
  };

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.patient_id.toLowerCase().includes(query) ||
      patient.name.toLowerCase().includes(query) ||
      patient.symptoms.some((symptom) => symptom.toLowerCase().includes(query))
    );
  });

  return (
    <div className="patient-list">

      <div className="upload-section">
        <div className="upload-controls">
          <div className="file-upload-wrapper">
            <label htmlFor="file-upload" className="file-upload-label">
              {uploading ? 'Uploading...' : 'Upload Patient JSON'}
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={uploading}
              className="file-input"
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Overwrite existing patients
          </label>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={patients.length === 0}
          >
            Export Patients
          </button>
          <button
            className="refresh-button"
            onClick={fetchPatients}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh List'}
          </button>
        </div>
        {success && (
          <div className="success-message">{success}</div>
        )}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            type="text"
            placeholder="Search by ID, name, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <span className="patient-count">
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="table-container">
        {filteredPatients.length === 0 ? (
          <div className="no-data">No patients found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Symptoms</th>
                <th>Duration (days)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.patient_id}>
                  <td>{patient.patient_id}</td>
                  <td>{patient.name}</td>
                  <td>{patient.age}</td>
                  <td>{patient.gender}</td>
                  <td>
                    <div className="symptoms-list">
                      {patient.symptoms.map((symptom, idx) => (
                        <span key={idx} className="symptom-tag">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{patient.symptom_duration_days}</td>
                  <td>
                    <button
                      className="assess-button"
                      onClick={() => handleAssess(patient.patient_id)}
                    >
                      Assess
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PatientList;

