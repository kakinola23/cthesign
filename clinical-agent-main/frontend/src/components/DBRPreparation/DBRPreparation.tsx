import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TableDetailsForm from './TableDetailsForm';
import AttributeDetailsForm from './AttributeDetailsForm';
import './DBRPreparation.css';

interface TableDBRData {
  tableId: string;
  tab: string;
  tableDetails: {
    rcc: string;
    sla: string;
    tableName: string;
    schema: string;
    filter?: string;
    ccms?: string;
  } | null;
  attributes: Array<{
    columnName: string;
    pci?: string;
    rcc?: string;
    sla?: string;
  }>;
  status: string;
}

const DBRPreparation: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [dbrData, setDbrData] = useState<TableDBRData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'table_details' | 'attributes'>('table_details');

  useEffect(() => {
    if (!tableId) {
      setError('Table ID is required');
      setLoading(false);
      return;
    }

    fetchDBRData();
  }, [tableId]);

  const fetchDBRData = async () => {
    if (!tableId) return;

    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch DBR preparation data');
      }

      const data: TableDBRData = await response.json();
      setDbrData(data);

      // Determine current step based on status
      if (data.status === 'table_details_pending' || !data.tableDetails) {
        setCurrentStep('table_details');
      } else {
        // Show attributes step (will be read-only if dbr_ready)
        setCurrentStep('attributes');
      }
    } catch (err) {
      console.error('Error fetching DBR data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DBR preparation data');
    } finally {
      setLoading(false);
    }
  };

  const handleTableDetailsSaved = () => {
    // Move to attributes step
    setCurrentStep('attributes');
    fetchDBRData(); // Refresh data
  };

  const handleAttributesSaved = () => {
    // Navigate back to Step 1
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dbr-preparation">
        <div className="loading-container">
          <div className="loading">Loading DBR preparation data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dbr-preparation">
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button className="back-button" onClick={() => navigate('/')}>
            Back to Step 1
          </button>
        </div>
      </div>
    );
  }

  if (!dbrData) {
    return (
      <div className="dbr-preparation">
        <div className="error-container">
          <div className="error-message">DBR preparation data not found</div>
          <button className="back-button" onClick={() => navigate('/')}>
            Back to Step 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dbr-preparation">
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/')}>
          Step 1: Monitor - Drone Status
        </span>
        <span className="breadcrumb-separator">→</span>
        <span className="breadcrumb-current">Step 2: Engine - DBR Preparation</span>
      </div>

      <div className="progress-indicator">
        <div 
          className={`progress-step ${currentStep === 'table_details' ? 'active' : 'completed'}`}
          onClick={dbrData.tableDetails && dbrData.status !== 'dbr_ready' ? () => setCurrentStep('table_details') : undefined}
          style={dbrData.tableDetails && dbrData.status !== 'dbr_ready' ? { cursor: 'pointer' } : {}}
        >
          <div className="step-number">1</div>
          <div className="step-label">Table Details</div>
        </div>
        <div className="progress-line"></div>
        <div 
          className={`progress-step ${currentStep === 'attributes' ? 'active' : currentStep === 'table_details' ? 'pending' : 'completed'}`}
          onClick={dbrData.tableDetails ? () => setCurrentStep('attributes') : undefined}
          style={dbrData.tableDetails ? { cursor: 'pointer' } : {}}
        >
          <div className="step-number">2</div>
          <div className="step-label">Attribute Details</div>
        </div>
      </div>

      <div className="table-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Table: {dbrData.tab}</h3>
            <p>Table ID: {dbrData.tableId}</p>
          </div>
          {dbrData.tableDetails && (
            <button
              className="download-button"
              onClick={async () => {
                try {
                  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
                  const response = await fetch(`${apiUrl}/api/dbr/${tableId}/download`);
                  if (!response.ok) throw new Error('Download failed');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const contentDisposition = response.headers.get('Content-Disposition');
                  let filename = `DBR_${dbrData.tab}_${tableId}.xlsx`;
                  if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                    if (filenameMatch) filename = filenameMatch[1];
                  }
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  alert('Failed to download. Please try again.');
                }
              }}
            >
              Download Excel
            </button>
          )}
        </div>
      </div>

      {currentStep === 'table_details' && (
        <TableDetailsForm
          tableId={tableId!}
          tab={dbrData.tab}
          existingData={dbrData.tableDetails}
          onSave={handleTableDetailsSaved}
          readOnly={dbrData.status === 'dbr_ready'}
        />
      )}

      {currentStep === 'attributes' && (
        <AttributeDetailsForm
          tableId={tableId!}
          tab={dbrData.tab}
          tableDetails={dbrData.tableDetails}
          existingAttributes={dbrData.attributes}
          onSave={handleAttributesSaved}
          readOnly={dbrData.status === 'dbr_ready'}
        />
      )}
    </div>
  );
};

export default DBRPreparation;

