import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, AssessmentResponse, Patient } from '../services/api';
import './PatientAssessment.css';

const PatientAssessment: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [assessing, setAssessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientAndAssessment = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);
    try {
      const patients = await apiService.getPatients();
      const foundPatient = patients.find((p) => p.patient_id === patientId);
      if (foundPatient) {
        setPatient(foundPatient);
      } else {
        setError(`Patient ${patientId} not found`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load patient data';
      setError(errorMessage);
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientAndAssessment();
  }, [fetchPatientAndAssessment]);

  const handleAssess = async () => {
    if (!patientId) return;

    setAssessing(true);
    setError(null);
    try {
      const result = await apiService.assessPatient(patientId);
      setAssessment(result);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to assess patient';
      setError(errorMessage);
      console.error('Error assessing patient:', err);
    } finally {
      setAssessing(false);
    }
  };

  const handleDownloadResults = () => {
    if (!assessment || !patient) return;

    const resultsData = {
      patient: {
        patient_id: patient.patient_id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        smoking_history: patient.smoking_history,
        symptoms: patient.symptoms,
        symptom_duration_days: patient.symptom_duration_days,
      },
      assessment: {
        prediction: assessment.prediction,
        risk_level: assessment.risk_level,
        reasoning: assessment.reasoning,
        recommended_action: assessment.recommended_action,
        citations: assessment.citations,
        timestamp: new Date().toISOString(),
      }
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(resultsData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment_${patient.patient_id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPredictionClass = (prediction: string): string => {
    if (prediction.includes('Urgent')) return 'prediction-urgent';
    if (prediction.includes('Routine')) return 'prediction-routine';
    return 'prediction-investigation';
  };

  const getRiskClass = (risk: string): string => {
    if (risk === 'High') return 'risk-high';
    if (risk === 'Moderate') return 'risk-moderate';
    return 'risk-low';
  };

  if (loading) {
    return (
      <div className="patient-assessment">
        <div className="loading">Loading patient data...</div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="patient-assessment">
        <div className="error-message">{error}</div>
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div className="patient-assessment">
      <div className="assessment-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Patients
        </button>
        <h3>Patient Assessment</h3>
      </div>

      {patient && (
        <div className="patient-info-card">
          <h4>Patient Information</h4>
          <div className="patient-details">
            <div className="detail-row">
              <span className="detail-label">Patient ID:</span>
              <span className="detail-value">{patient.patient_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{patient.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Age:</span>
              <span className="detail-value">{patient.age} years</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Gender:</span>
              <span className="detail-value">{patient.gender}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Smoking History:</span>
              <span className="detail-value">{patient.smoking_history}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Symptoms:</span>
              <div className="symptoms-list">
                {patient.symptoms.map((symptom, idx) => (
                  <span key={idx} className="symptom-tag">
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Symptom Duration:</span>
              <span className="detail-value">{patient.symptom_duration_days} days</span>
            </div>
          </div>
        </div>
      )}

      <div className="assessment-actions">
        <button
          className="assess-button"
          onClick={handleAssess}
          disabled={assessing}
        >
          {assessing ? 'Assessing...' : 'Run Assessment'}
        </button>
        <button
          className="chat-button"
          onClick={() => navigate(`/chat/${patientId}`)}
        >
          Open Chat
        </button>
        <button 
              className="download-button" 
              onClick={handleDownloadResults}
              title="Download results as JSON"
            >
              📥 Download JSON
            </button>
      </div>

      {error && assessment === null && (
        <div className="error-message">{error}</div>
      )}

      {assessment && (
        <div className="assessment-results">
          
          <div className="result-cards">
            <div className={`result-card ${getPredictionClass(assessment.prediction)}`}>
              <div className="result-label">Prediction</div>
              <div className="result-value">{assessment.prediction}</div>
            </div>
            <div className={`result-card ${getRiskClass(assessment.risk_level)}`}>
              <div className="result-label">Risk Level</div>
              <div className="result-value">{assessment.risk_level}</div>
            </div>
          </div>

          <div className="result-section">
            <h5>Reasoning</h5>
            <div className="reasoning-text">{assessment.reasoning}</div>
          </div>

          <div className="result-section">
            <h5>Recommended Action</h5>
            <div className="action-text">{assessment.recommended_action}</div>
          </div>

          {assessment.citations && assessment.citations.length > 0 && (
            <div className="result-section">
              <h5>Citations</h5>
              <div className="citations-list">
                {assessment.citations.map((citation, idx) => (
                  <div key={idx} className="citation-item">
                    <div className="citation-header">
                      <span className="citation-source">{citation.source}</span>
                      {citation.page && (
                        <span className="citation-page">Page {citation.page}</span>
                      )}
                      {citation.section && (
                        <span className="citation-section">{citation.section}</span>
                      )}
                    </div>
                    <div className="citation-excerpt">{citation.excerpt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientAssessment;