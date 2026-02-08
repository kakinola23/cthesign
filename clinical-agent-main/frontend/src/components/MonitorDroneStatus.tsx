import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MonitorDroneStatus.css';

interface TableRow {
  id: string;
  tab: string;
  droneStatus: 'New' | 'Done';
  dgStatus: 'New' | 'Processing' | 'DBR Ready' | 'Approved' | 'Rejected' | null;
}

interface TableResponse {
  tables: TableRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ProcessResponse {
  message: string;
  processedCount: number;
  updatedTables: TableRow[];
}

const MonitorDroneStatus: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<boolean>(false);

  // Fetch tables from API
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

      // Try proxy first, fallback to direct URL
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/tables?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tables: ${response.status} ${response.statusText}`);
      }

      const data: TableResponse = await response.json();
      setTables(data.tables);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Error fetching tables:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load tables. Please ensure the backend server is running on http://localhost:8001';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [statusFilter, searchQuery, currentPage, rowsPerPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const readyRows = tables.filter(
        (table) => table.droneStatus === 'New' && table.dgStatus === 'New'
      );
      setSelectedRows(new Set(readyRows.map((table) => table.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleProcessSelected = async () => {
    if (selectedRows.size === 0) {
      alert('Please select at least one table to process');
      return;
    }

    setProcessing(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/tables/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableIds: Array.from(selectedRows),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process tables');
      }

      const data: ProcessResponse = await response.json();
      if (data.processedCount > 0) {
        // Navigate to DBR Preparation for the first processed table
        const firstTableId = data.updatedTables[0]?.id;
        if (firstTableId) {
          navigate(`/dbr-preparation/${firstTableId}`);
        } else {
          alert(`${data.message}. ${data.processedCount} table(s) moved to DBR Preparation.`);
          setSelectedRows(new Set());
          fetchTables(); // Refresh the table list
        }
      } else {
        alert('No tables were processed.');
        setSelectedRows(new Set());
      }
    } catch (error) {
      console.error('Error processing tables:', error);
      alert('Failed to process tables. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessSingle = async (tableId: string) => {
    setProcessing(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001';
      const response = await fetch(`${apiUrl}/api/tables/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableIds: [tableId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process table');
      }

      const data: ProcessResponse = await response.json();
      if (data.processedCount > 0) {
        // Navigate to DBR Preparation for this table
        navigate(`/dbr-preparation/${tableId}`);
      } else {
        alert('Table is not ready for processing.');
      }
    } catch (error) {
      console.error('Error processing table:', error);
      alert('Failed to process table. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const isReadyToProcess = (table: TableRow): boolean => {
    return table.droneStatus === 'New' && table.dgStatus === 'New';
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

  const allReadyRowsSelected =
    tables.length > 0 &&
    tables.filter(isReadyToProcess).every((table) => selectedRows.has(table.id)) &&
    tables.filter(isReadyToProcess).length > 0;

  return (
    <div className="monitor-drone-status">
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="ready">Ready to Process</option>
            <option value="new">New</option>
            <option value="done">Done</option>
          </select>
        </div>

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

        <button
          className="apply-button"
          onClick={handleProcessSelected}
          disabled={selectedRows.size === 0 || processing}
        >
          {processing ? 'Processing...' : 'Process Selected'}
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading tables...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allReadyRowsSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Tab</th>
                <th>Drone Status</th>
                <th>DG Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-data">
                    No tables found
                  </td>
                </tr>
              ) : (
                tables.map((table) => {
                  const ready = isReadyToProcess(table);
                  return (
                    <tr
                      key={table.id}
                      className={ready ? 'row-ready-to-process' : ''}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(table.id)}
                          onChange={(e) =>
                            handleRowSelect(table.id, e.target.checked)
                          }
                          disabled={!ready}
                        />
                      </td>
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
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {ready && (
                            <button
                              className="process-button"
                              onClick={() => handleProcessSingle(table.id)}
                              disabled={processing}
                            >
                              Process
                            </button>
                          )}
                          {(table.dgStatus === 'Processing' || table.dgStatus === 'DBR Ready') && (
                            <button
                              className="view-button"
                              onClick={() => navigate(`/dbr-preparation/${table.id}`)}
                            >
                              {table.dgStatus === 'Processing' ? 'Continue' : 'View'}
                            </button>
                          )}
                          {table.dgStatus === 'DBR Ready' && (
                            <button
                              className="approve-button"
                              onClick={() => navigate('/dbr-approval')}
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination-section">
        <div className="pagination-info">
          Showing {tables.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}{' '}
          to {Math.min(currentPage * rowsPerPage, total)} of {total} entries
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

export default MonitorDroneStatus;

