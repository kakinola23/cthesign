import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/patients')}>
          <div className="card-icon">👥</div>
          <h3>Patient Management</h3>
          <p>Upload patient JSON files and manage patient records</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/chat')}>
          <div className="card-icon">💬</div>
          <h3>Chat with Guidelines</h3>
          <p>Ask questions about NG12 Cancer Guidelines (PDF only)</p>
        </div>

        <div className="dashboard-card" onClick={() => navigate('/health')}>
          <div className="card-icon">🏥</div>
          <h3>System Health</h3>
          <p>Check API status and vector store connection</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

