import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import './HealthCheck.css';

const HealthCheck: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.healthCheck();
      setHealth(data);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to check health status';
      setError(errorMessage);
      console.error('Error checking health:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string): string => {
    if (status === 'healthy' || status === 'connected') return 'status-healthy';
    return 'status-unhealthy';
  };

  if (loading) {
    return (
      <div className="health-check">
        <div className="loading">Checking system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-check">
        <div className="error-message">{error}</div>
        <button className="retry-button" onClick={checkHealth}>
          Retry
        </button>
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="health-check">
      <div className="health-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h3>System Health Status</h3>
        <button className="refresh-button" onClick={checkHealth}>
          Refresh
        </button>
      </div>

      <div className="health-cards">
        <div className={`health-card ${getStatusClass(health?.status || '')}`}>
          <div className="health-label">API Status</div>
          <div className="health-value">{health?.status || 'Unknown'}</div>
        </div>

        <div className={`health-card ${getStatusClass(health?.vector_store || '')}`}>
          <div className="health-label">Vector Store</div>
          <div className="health-value">{health?.vector_store || 'Unknown'}</div>
        </div>
      </div>

      <div className="services-section">
        <h4>Available Services</h4>
        <div className="services-list">
          {health?.services?.map((service: string, idx: number) => (
            <div key={idx} className="service-item">
              {service}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;

