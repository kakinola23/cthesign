import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DBRApproval.css';

interface TableRow {
  id: string;
  tab: string;
  droneStatus: 'New' | 'Done';
  dgStatus: 'New' | 'Processing' | 'DBR Ready' | 'Approved' | 'Rejected' | null;
}

interface DBRApprovalProps {
  tableId?: string;
}

const DBRApproval: React.FC<DBRApprovalProps> = ({ tableId }) => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('dbr_ready');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedTable, setSelectedTable] = useState<string | null>(tableId || null);
  const [comments, setComments] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
  }, [statusFilter, searchQuery, currentPage, rowsPerPage]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: rowsPerPage.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/tables?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const data = await response.json();
      // Filter to show only DBR Ready tables
      const dbrReadyTables = data.tables.filter(
        (table: TableRow) => table.dgStatus === 'DBR Ready'
      );
      setTables(dbrReadyTables);
      setTotal(dbrReadyTables.length);
      setTotalPages(Math.ceil(dbrReadyTables.length / rowsPerPage) || 1);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching tables:', error);
      alert('Failed to load tables. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (tableId: string) => {
    setActionLoading(`download-${tableId}`);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download DBR data');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `DBR_${tableId}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`Downloaded DBR data for ${tables.find(t => t.id === tableId)?.tab}`);
    } catch (error) {
      console.error('Error downloading DBR:', error);
      alert('Failed to download DBR data. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (tableId: string) => {
    if (!comments.trim() && !window.confirm('Approve without comments?')) {
      return;
    }

    setActionLoading(`approve-${tableId}`);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: comments.trim() || null }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to approve table' }));
        throw new Error(errorData.detail || 'Failed to approve table');
      }

      const result = await response.json();
      alert(result.message || 'Table approved successfully');
      setComments('');
      setSelectedTable(null);
      fetchTables(); // Refresh the table list
    } catch (error) {
      console.error('Error approving table:', error);
      alert(error instanceof Error ? error.message : 'Failed to approve table. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (tableId: string) => {
    if (!comments.trim()) {
      alert('Comments are required when rejecting a table');
      return;
    }

    if (!window.confirm('Are you sure you want to reject this table?')) {
      return;
    }

    setActionLoading(`reject-${tableId}`);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/dbr/${tableId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: comments.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to reject table' }));
        throw new Error(errorData.detail || 'Failed to reject table');
      }

      const result = await response.json();
      alert(result.message || 'Table rejected');
      setComments('');
      setSelectedTable(null);
      fetchTables(); // Refresh the table list
    } catch (error) {
      console.error('Error rejecting table:', error);
      alert(error instanceof Error ? error.message : 'Failed to reject table. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusClass = (status: string | null): string => {
    if (!status) return '';
    if (status === 'New') return 'status-new';
    if (status === 'Done') return 'status-done';
    if (status === 'Approved') return 'status-approved';
    if (status === 'Rejected') return 'status-rejected';
    if (status === 'Processing') return 'status-processing';
    if (status === 'DBR Ready') return 'status-dbr-ready';
    return '';
  };

  return (
    <div className="dbr-approval">
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            type="text"
            placeholder="Tab"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="rows-per-page">Rows per page:</label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading tables...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tab</th>
                <th>Drone Status</th>
                <th>DG Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-data">
                    No DBR Ready tables found
                  </td>
                </tr>
              ) : (
                tables.map((table) => (
                  <tr key={table.id} className={selectedTable === table.id ? 'row-selected' : ''}>
                    <td>{table.tab}</td>
                    <td>
                      <span className={getStatusClass(table.droneStatus)}>
                        {table.droneStatus}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(table.dgStatus)}>
                        {table.dgStatus || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-button download-button"
                          onClick={() => handleDownload(table.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === `download-${table.id}` ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                          className="action-button approve-button"
                          onClick={() => {
                            setSelectedTable(table.id);
                            if (selectedTable !== table.id) {
                              setComments('');
                            }
                          }}
                          disabled={actionLoading !== null}
                        >
                          Approve
                        </button>
                        <button
                          className="action-button reject-button"
                          onClick={() => {
                            setSelectedTable(table.id);
                            if (selectedTable !== table.id) {
                              setComments('');
                            }
                          }}
                          disabled={actionLoading !== null}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedTable && (
        <div className="approval-panel">
          <h3>Action for: {tables.find(t => t.id === selectedTable)?.tab}</h3>
          <div className="comments-section">
            <label htmlFor="comments">
              Comments {selectedTable && tables.find(t => t.id === selectedTable) && (
                <span className="required">*</span>
              )}
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter comments (required for rejection)"
              rows={4}
              className="comments-input"
            />
          </div>
          <div className="approval-actions">
            <button
              className="approve-confirm-button"
              onClick={() => handleApprove(selectedTable)}
              disabled={actionLoading !== null}
            >
              {actionLoading === `approve-${selectedTable}` ? 'Approving...' : 'Confirm Approve'}
            </button>
            <button
              className="reject-confirm-button"
              onClick={() => handleReject(selectedTable)}
              disabled={actionLoading !== null}
            >
              {actionLoading === `reject-${selectedTable}` ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setSelectedTable(null);
                setComments('');
              }}
              disabled={actionLoading !== null}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="pagination-section">
        <div className="pagination-info">
          Showing {tables.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{' '}
          {Math.min(currentPage * rowsPerPage, total)} of {total} entries
        </div>
        <div className="pagination-controls">
          <button
            className="page-button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            className="page-button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DBRApproval;

