// API service for Clinical Decision Support Agent

// API URL configuration:
// - In Docker/production: Uses /api which is proxied by nginx to backend
// - In development: Uses http://localhost:8000 directly
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  smoking_history: string;
  symptoms: string[];
  symptom_duration_days: number;
}

export interface Citation {
  source: string;
  page?: number;
  section?: string;
  excerpt: string;
}

export interface AssessmentResponse {
  prediction: 'Urgent Referral' | 'Urgent Investigation' | 'Routine/GP Management';
  risk_level: 'High' | 'Moderate' | 'Low';
  reasoning: string;
  recommended_action: string;
  citations: Citation[];
  patient_id: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  top_k?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface ChatResponse {
  session_id: string;
  answer: string;
  citations: Citation[];
  grounded: boolean;
}

export interface ChatHistory {
  session_id: string;
  messages: ChatMessage[];
  created_at: string;
  last_updated: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Build URL - if baseUrl is empty (production), use endpoint directly
    // Otherwise, concatenate baseUrl and endpoint
    const url = this.baseUrl ? `${this.baseUrl}${cleanEndpoint}` : cleanEndpoint;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; vector_store: string; services: string[] }>('/health');
  }

  // Patient endpoints
  async getPatients(): Promise<Patient[]> {
    return this.request<Patient[]>('/patients');
  }

  async importPatients(file: File, overwrite: boolean = false): Promise<{ success: boolean; message: string; total_patients: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', overwrite.toString());

    const endpoint = '/patients/import';
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header for FormData, browser will set it with boundary
      headers: {},
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async exportPatients(): Promise<{ filename: string; count: number; patients: Patient[] }> {
    return this.request<{ filename: string; count: number; patients: Patient[] }>('/patients/export');
  }

  // Assessment endpoint
  async assessPatient(patientId: string): Promise<AssessmentResponse> {
    return this.request<AssessmentResponse>(`/assess/${patientId}`, {
      method: 'POST',
    });
  }

  // Chat endpoints
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getChatHistory(sessionId: string): Promise<ChatHistory> {
    return this.request<ChatHistory>(`/chat/${sessionId}/history`);
  }

  async listChatSessions(): Promise<{ count: number; sessions: ChatHistory[] }> {
    return this.request<{ count: number; sessions: ChatHistory[] }>('/chat/sessions');
  }

  async deleteChatSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/chat/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

