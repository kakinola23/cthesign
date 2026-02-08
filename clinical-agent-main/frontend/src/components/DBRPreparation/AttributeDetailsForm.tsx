import React, { useState, useEffect } from 'react';
import './DBRPreparation.css';

interface AttributeDetails {
  columnName: string;
  pci?: string;
  rcc?: string;
  sla?: string;
  dbrTab?: string;
  classification?: string;
  source?: string;
  sampleValue?: string;
  comments?: string;
}

interface TableDetails {
  rcc: string;
  sla: string;
  tableName: string;
  schema: string;
  filter?: string;
  ccms?: string;
}

interface AttributeDetailsFormProps {
  tableId: string;
  tab: string;
  tableDetails: TableDetails | null;
  existingAttributes: AttributeDetails[];
  onSave: () => void;
  readOnly?: boolean; // If true, form is read-only for review
}

const AttributeDetailsForm: React.FC<AttributeDetailsFormProps> = ({
  tableId,
  tab,
  tableDetails,
  existingAttributes,
  onSave,
  readOnly = false,
}) => {
  const [attributes, setAttributes] = useState<AttributeDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tableDetails) {
      setLoading(false);
      return;
    }

    fetchAttributes();
  }, [tableId, tableDetails]);

  const fetchAttributes = async () => {
    if (!tableDetails) return;

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/attributes`);

      if (!response.ok) {
        throw new Error('Failed to fetch attributes');
      }

      const data: AttributeDetails[] = await response.json();
      setAttributes(data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      alert('Failed to load attributes. Please ensure table details are saved first.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (columnName: string, field: keyof AttributeDetails, value: string) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.columnName === columnName ? { ...attr, [field]: value } : attr
      )
    );

    // Clear error for this attribute if it's PCI
    if (field === 'pci' && errors[columnName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[columnName];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    attributes.forEach((attr) => {
      if (!attr.pci || attr.pci.trim() === '') {
        newErrors[attr.columnName] = 'PCI classification is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attributes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save attribute details' }));
        throw new Error(errorData.detail || 'Failed to save attribute details');
      }

      const result = await response.json();
      alert(result.message || 'Attribute details saved successfully. Table is now DBR Ready.');
      onSave();
    } catch (error) {
      console.error('Error saving attribute details:', error);
      alert(error instanceof Error ? error.message : 'Failed to save attribute details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!tableDetails) {
    return (
      <div className="dbr-form-container">
        <div className="error-message">
          Please complete table details first before entering attribute details.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dbr-form-container">
        <div className="loading">Loading attributes from CCMS...</div>
      </div>
    );
  }

  return (
    <div className="dbr-form-container">
      <div className="form-header">
        <h2>Attribute Details</h2>
        <p className="form-description">
          Process data from CCMS and view the attribute page. Enter attribute details (PCI, etc.) and click Submit.
        </p>
      </div>

      <div className="table-details-summary">
        <h3>Table Details Summary</h3>
        <div className="summary-grid">
          <div><strong>RCC:</strong> {tableDetails.rcc}</div>
          <div><strong>SLA:</strong> {tableDetails.sla}</div>
          <div><strong>Table Name:</strong> {tableDetails.tableName}</div>
          <div><strong>Schema:</strong> {tableDetails.schema}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="dbr-form">
        <div className="attributes-table-container">
          <table className="attributes-table">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>RCC</th>
                <th>SLA</th>
                <th>
                  PCI {!readOnly && <span className="required">*</span>}
                </th>
                <th>DBR Tab</th>
                <th>Auto/Semi/Manu/Constant</th>
                <th>Source</th>
                <th>Sample Value</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {attributes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-data">
                    No attributes found
                  </td>
                </tr>
              ) : (
                attributes.map((attr) => (
                  <tr key={attr.columnName}>
                    <td>{attr.columnName}</td>
                    <td>{attr.rcc || '-'}</td>
                    <td>{attr.sla || '-'}</td>
                    <td>
                      {readOnly ? (
                        <span>{attr.pci || '-'}</span>
                      ) : (
                        <>
                          <select
                            value={attr.pci || ''}
                            onChange={(e) => handleFieldChange(attr.columnName, 'pci', e.target.value)}
                            className={errors[attr.columnName] ? 'error attribute-select' : 'attribute-select'}
                          >
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                          {errors[attr.columnName] && (
                            <span className="error-message-inline">{errors[attr.columnName]}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span>{attr.dbrTab || '-'}</span>
                      ) : (
                        <select
                          value={attr.dbrTab || ''}
                          onChange={(e) => handleFieldChange(attr.columnName, 'dbrTab', e.target.value)}
                          className="attribute-select"
                        >
                          <option value="">Select...</option>
                          <option value="Data_Specifications">Data_Specifications</option>
                          <option value="Data_Quality">Data_Quality</option>
                          <option value="Data_Lineage">Data_Lineage</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span>{attr.classification || '-'}</span>
                      ) : (
                        <select
                          value={attr.classification || ''}
                          onChange={(e) => handleFieldChange(attr.columnName, 'classification', e.target.value)}
                          className="attribute-select"
                        >
                          <option value="">Select...</option>
                          <option value="Auto">Auto</option>
                          <option value="Semi">Semi</option>
                          <option value="Manu">Manu</option>
                          <option value="Constant">Constant</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span>{attr.source || '-'}</span>
                      ) : (
                        <input
                          type="text"
                          value={attr.source || ''}
                          onChange={(e) => handleFieldChange(attr.columnName, 'source', e.target.value)}
                          placeholder="Enter source"
                          className="attribute-input"
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span>{attr.sampleValue || '-'}</span>
                      ) : (
                        <input
                          type="text"
                          value={attr.sampleValue || ''}
                          onChange={(e) => handleFieldChange(attr.columnName, 'sampleValue', e.target.value)}
                          placeholder="Enter sample value"
                          className="attribute-input"
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <span>{attr.comments || '-'}</span>
                      ) : (
                        <input
                          type="text"
                          value={attr.comments || ''}
                          onChange={(e) => handleFieldChange(attr.columnName, 'comments', e.target.value)}
                          placeholder="Enter comments"
                          className="attribute-input"
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!readOnly && (
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AttributeDetailsForm;

