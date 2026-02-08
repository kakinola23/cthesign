import React, { useState, useEffect } from 'react';
import './DBRPreparation.css';

interface TableDetails {
  rcc: string;
  sla: string;
  tableName: string;
  schema: string;
  filter?: string;
  ccms?: string;
}

interface TableDetailsFormProps {
  tableId: string;
  tab: string;
  existingData: TableDetails | null;
  onSave: () => void;
  readOnly?: boolean; // If true, form is read-only for review
}

const TableDetailsForm: React.FC<TableDetailsFormProps> = ({
  tableId,
  tab,
  existingData,
  onSave,
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<TableDetails>({
    rcc: existingData?.rcc || '',
    sla: existingData?.sla || '',
    tableName: existingData?.tableName || tab || '', // Pre-fill with tab from Step 1
    schema: existingData?.schema || '',
    filter: existingData?.filter || '',
    ccms: existingData?.ccms || '',
  });
  
  const [fetchingMetadata, setFetchingMetadata] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rcc.trim()) {
      newErrors.rcc = 'RCC is required';
    }
    if (!formData.sla.trim()) {
      newErrors.sla = 'SLA is required';
    }
    if (!formData.tableName.trim()) {
      newErrors.tableName = 'Table Name is required';
    }
    if (!formData.schema.trim()) {
      newErrors.schema = 'Schema is required';
    }

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
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/table-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save table details' }));
        throw new Error(errorData.detail || 'Failed to save table details');
      }

      const result = await response.json();
      alert(result.message || 'Table details saved successfully');
      onSave();
    } catch (error) {
      console.error('Error saving table details:', error);
      alert(error instanceof Error ? error.message : 'Failed to save table details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof TableDetails) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Fetch RCC and SLA from CCMS when both tableName and schema are entered
  useEffect(() => {
    const fetchMetadata = async () => {
      // Only fetch if both tableName and schema are provided and not already fetched
      if (formData.tableName.trim() && formData.schema.trim() && (!formData.rcc || !formData.sla)) {
        setFetchingMetadata(true);
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
          const response = await fetch(
            `${apiUrl}/api/dbr/${tableId}/ccms-metadata?tableName=${encodeURIComponent(formData.tableName)}&schema=${encodeURIComponent(formData.schema)}`
          );
          
          if (response.ok) {
            const data = await response.json();
            setFormData((prev) => ({
              ...prev,
              rcc: data.rcc,
              sla: data.sla,
            }));
          } else {
            // Table not found in CCMS - clear RCC and SLA
            setFormData((prev) => ({
              ...prev,
              rcc: '',
              sla: '',
            }));
          }
        } catch (error) {
          console.error('Error fetching CCMS metadata:', error);
          // Don't show error to user, just don't auto-fill
        } finally {
          setFetchingMetadata(false);
        }
      }
    };
    
    // Debounce the API call
    const timeoutId = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.tableName, formData.schema, tableId]);

  return (
    <div className="dbr-form-container">
      <div className="form-header">
        <h2>Table Details</h2>
        <p className="form-description">
          Enter table details (SLA, Table, Schema, Filter, RCC, etc.) and click Next.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="dbr-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="rcc">
              RCC {!readOnly && <span className="required">*</span>}
              {fetchingMetadata && !readOnly && <span style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }}>(Fetching from CCMS...)</span>}
            </label>
            {readOnly ? (
              <div className="read-only-value">{formData.rcc || '-'}</div>
            ) : (
              <>
                <input
                  id="rcc"
                  type="text"
                  value={formData.rcc}
                  onChange={handleChange('rcc')}
                  className={errors.rcc ? 'error' : ''}
                  placeholder="Auto-filled from CCMS"
                  readOnly={fetchingMetadata}
                />
                {errors.rcc && <span className="error-message">{errors.rcc}</span>}
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="sla">
              SLA {!readOnly && <span className="required">*</span>}
              {fetchingMetadata && !readOnly && <span style={{ marginLeft: '8px', color: '#007bff', fontSize: '12px' }}>(Fetching from CCMS...)</span>}
            </label>
            {readOnly ? (
              <div className="read-only-value">{formData.sla || '-'}</div>
            ) : (
              <>
                <input
                  id="sla"
                  type="text"
                  value={formData.sla}
                  onChange={handleChange('sla')}
                  className={errors.sla ? 'error' : ''}
                  placeholder="Auto-filled from CCMS"
                  readOnly={fetchingMetadata}
                />
                {errors.sla && <span className="error-message">{errors.sla}</span>}
              </>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tableName">
              Table Name <span className="required">*</span>
            </label>
            <input
              id="tableName"
              type="text"
              value={formData.tableName}
              onChange={handleChange('tableName')}
              className={errors.tableName ? 'error' : ''}
              placeholder="Enter table name"
            />
            {errors.tableName && <span className="error-message">{errors.tableName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="schema">
              Schema <span className="required">*</span>
            </label>
            <input
              id="schema"
              type="text"
              value={formData.schema}
              onChange={handleChange('schema')}
              className={errors.schema ? 'error' : ''}
              placeholder="Enter schema"
            />
            {errors.schema && <span className="error-message">{errors.schema}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="filter">Filter</label>
            <input
              id="filter"
              type="text"
              value={formData.filter}
              onChange={handleChange('filter')}
              placeholder="Enter filter (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ccms">CCMS</label>
            <input
              id="ccms"
              type="text"
              value={formData.ccms}
              onChange={handleChange('ccms')}
              placeholder="Enter CCMS (optional)"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TableDetailsForm;

