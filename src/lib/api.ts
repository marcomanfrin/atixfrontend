// API configuration and helper functions
// This will connect to your backend

import { PaginatedResponse } from '@/types';
import type {
  ChecklistTemplateItem,
  PublicRapportinoPreview,
  RapportiniFilters,
  RapportinoCreateRequest,
  RapportinoDetail,
  RapportinoListItem,
  RapportinoSignRequest,
  RapportinoUpdateRequest,
  SignatureRequestCreated,
} from '@/types/rapportino';
import type { CalendarEvent, CalendarEventInput } from '@/types/calendar';
import * as Sentry from '@sentry/react';
import i18n from '@/lib/i18n';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Get stored auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// API request helper
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to parse error response for logging (development only)
    const rawError = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`
    }));

    // Log detailed error info for debugging (development only)
    if (import.meta.env.DEV) {
      console.error('API Error:', { status: response.status, error: rawError, endpoint });
    }

    // Sanitize error messages - only allow safe, user-friendly messages
    const sanitizeErrorMessage = (error: any, status: number): string => {
      const translateError = (key: string, fallback: string) =>
        i18n.t(`common:errors.${key}`, { defaultValue: fallback });

      // Whitelist of safe error messages that can be shown to users
      const safeMessages: Record<string, string> = {
        'Invalid credentials': 'invalidCredentials',
        'Email already exists': 'emailExists',
        'Validation failed': 'validationFailed',
        'Resource not found': 'notFound',
        'Session expired': 'sessionExpired',
      };

      // If the error message is in our safe list, return the localized message
      if (error?.message && safeMessages[error.message]) {
        return translateError(safeMessages[error.message], error.message);
      }

      // Otherwise, return generic messages based on status code
      switch (status) {
        case 400:
          return translateError('invalidRequest', 'Invalid request. Please check your input.');
        case 401:
          return translateError('unauthorized', 'Authentication required');
        case 403:
          return translateError('forbidden', 'You do not have permission to perform this action');
        case 404:
          return translateError('notFound', 'The requested resource was not found');
        case 409:
          return translateError('conflict', 'A conflict occurred. Please refresh and try again.');
        case 422:
          return translateError('invalidData', 'The provided data is invalid');
        case 429:
          return translateError('tooManyRequests', 'Too many requests. Please wait and try again.');
        case 500:
        case 502:
        case 503:
        case 504:
          return translateError('serverError', 'A server error occurred. Please try again later.');
        default:
          return translateError('unexpectedError', 'An unexpected error occurred. Please try again.');
      }
    };

    const safeMessage = sanitizeErrorMessage(rawError, response.status);

    // Report error to Sentry with context
    Sentry.captureException(new Error(`API Error: ${safeMessage}`), {
      contexts: {
        api: {
          url: response.url,
          status: response.status,
          method: options.method || 'GET',
        },
      },
      tags: {
        api_error: true,
        status_code: response.status.toString(),
      },
      level: response.status >= 500 ? 'error' : 'warning',
    });

    // Handle specific status codes
    if (response.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
      throw new Error(safeMessage);
    }

    throw new Error(safeMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text) {
    return null as T;
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T;
  }

  return text as unknown as T;
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{
      token: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      id?: string;
      profileImageUrl?: string;
      sessionId?: string;
    }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),
  logout: (sessionId: string) =>
    apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};

// Users API
export const usersApi = {
  getAll: () => apiRequest<any[]>('/users'),
  getByType: (type: string) => apiRequest<any[]>(`/users/type/${type}`),
  getById: (id: string) => apiRequest<any>(`/users/${id}`),
  create: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    type: string;
  }) =>
    apiRequest<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updatePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    apiRequest<void>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadAvatar: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/users/${id}/avatar`, {
      method: 'PATCH',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    return response.json();
  },
  delete: (id: string) =>
    apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
  updateCalendarColor: (id: string | 'me', calendarColor: string) =>
    apiRequest<any>(`/users/${id}/calendar-color`, {
      method: 'PATCH',
      body: JSON.stringify({ calendarColor }),
    }),
};

// Calendar API
export const calendarApi = {
  getEvents: (params: { from: string; to: string; mine?: boolean; participantIds?: string[] }) => {
    const searchParams = new URLSearchParams({ from: params.from, to: params.to });
    if (params.mine) {
      searchParams.append('mine', 'true');
    }
    params.participantIds?.forEach((id) => searchParams.append('participantIds', id));
    return apiRequest<CalendarEvent[]>(`/calendar-events?${searchParams.toString()}`);
  },
  getById: (id: string) => apiRequest<CalendarEvent>(`/calendar-events/${id}`),
  create: (data: CalendarEventInput) =>
    apiRequest<CalendarEvent>('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: CalendarEventInput) =>
    apiRequest<CalendarEvent>(`/calendar-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/calendar-events/${id}`, { method: 'DELETE' }),
};

// Clients API
export const clientsApi = {
  // F2: sort clients alphabetically by name
  getAll: (page = 0, size = 20, search?: string, type?: string) => {
    let url = `/clients?page=${page}&size=${size}&sort=name,asc`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (type) {
      url += `&type=${type}`;
    }
    return apiRequest<any>(url);
  },
  getAllList: () => apiRequest<any[]>('/clients/all'),
  getById: (id: string) => apiRequest<any>(`/clients/${id}`),
  create: (data: { name: string; type: string }) =>
    apiRequest<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/clients/${id}`, { method: 'DELETE' }),
};

// Plants API
export const plantsApi = {
  getAll: (page = 0, size = 20, search?: string) => {
    let url = `/plants?page=${page}&size=${size}&sort=nasDirectory,desc`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return apiRequest<any>(url);
  },
  getAllList: () => apiRequest<any[]>('/plants/all'),
  getById: (id: string) => apiRequest<any>(`/plants/${id}`),
  create: (data: any) =>
    apiRequest<any>('/plants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/plants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/plants/${id}`, { method: 'DELETE' }),
};

// Works API
export const worksApi = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    return apiRequest<any>(`/works?${searchParams.toString()}`);
  },
  getById: (id: string) => apiRequest<any>(`/works/${id}`),
  create: (data: any) =>
    apiRequest<any>('/works', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/works/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  start: (id: string) =>
    apiRequest<any>(`/works/${id}/start`, { method: 'PATCH' }),
  close: (id: string) =>
    apiRequest<any>(`/works/${id}/close`, { method: 'PATCH' }),
  invoice: (id: string) =>
    apiRequest<any>(`/works/${id}/invoice`, { method: 'PATCH' }),
  reopen: (id: string) =>
    apiRequest<any>(`/works/${id}/reopen`, { method: 'PATCH' }),
  forceStatus: (id: string, status: string) =>
    apiRequest<any>(`/works/${id}/force-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  assignTechnician: (id: string, technicianId: string) =>
    apiRequest<any>(`/works/${id}/assign-technician`, {
      method: 'POST',
      body: JSON.stringify({ technicianId }),
    }),
  addReference: (id: string, data: any) =>
    apiRequest<any>(`/works/${id}/add-reference`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeReference: (id: string, referenceId: string) =>
    apiRequest<void>(`/works/${id}/references/${referenceId}`, { method: 'DELETE' }),
  unassignTechnician: (id: string, technicianId: string) =>
    apiRequest<void>(`/works/${id}/technicians/${technicianId}`, { method: 'DELETE' }),
  delete: (id: string) =>
    apiRequest<void>(`/works/${id}`, { method: 'DELETE' }),
};

// Tickets API
export const ticketsApi = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiRequest<any>(`/tickets?${searchParams.toString()}`);
  },
  getById: (id: string) => apiRequest<any>(`/tickets/${id}`),
  create: (data: any) =>
    apiRequest<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    apiRequest<any>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/tickets/${id}`, { method: 'DELETE' }),
};

// Work Reports API
export const workReportsApi = {
  getByWorkId: (workId: string) =>
    apiRequest<any>(`/work-reports/work/${workId}`),
  createEntry: (data: { workId: string; description: string; hours: number; date?: string; technicianId?: string }) =>
    apiRequest<any>('/work-reports/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEntries: (workId: string) =>
    apiRequest<any[]>(`/work-reports/entries/work/${workId}`),
  updateEntry: (id: string, data: { description?: string; hours?: number; date?: string }) =>
    apiRequest<any>(`/work-reports/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteEntry: (id: string) =>
    apiRequest<void>(`/work-reports/entries/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardApi = {
  getSummary: async (limit = 5) => {
    try {
      // Try GraphQL endpoint first
      const query = `
        query {
          dashboardSummary(limit: ${limit}) {
            clientsCount
            plantsCount
            completedWorksCount
            pendingWorksCount
            worksByStatus {
              status
              count
            }
            ticketsByStatus {
              status
              count
            }
            lastWorks {
              id
              name
              status
              createdAt
            }
            lastTickets {
              id
              name
              status
              createdAt
            }
          }
        }
      `;

      const response = await apiRequest<any>('/graphql', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      // Handle GraphQL response - map backend field names to frontend conventions
      if (response?.data?.dashboardSummary) {
        const s = response.data.dashboardSummary;
        return {
          clientCount: s.clientsCount,
          plantCount: s.plantsCount,
          completedWorkCount: s.completedWorksCount,
          pendingWorkCount: s.pendingWorksCount,
          workStatusCounts: s.worksByStatus,
          ticketStatusCounts: s.ticketsByStatus,
          recentWorks: s.lastWorks.map((w: any) => ({ ...w, orderDate: w.createdAt })),
          recentTickets: s.lastTickets,
        };
      }
    } catch (graphqlError) {
      console.warn('GraphQL dashboard endpoint not available, using REST endpoints');
    }

    // Fallback: Use REST endpoints to build dashboard data
    try {
      const [clientsRes, plantsRes, worksRes, ticketsRes] = await Promise.all([
        apiRequest<PaginatedResponse<any>>('/clients?page=0&size=1'),
        apiRequest<PaginatedResponse<any>>('/plants?page=0&size=1'),
        apiRequest<PaginatedResponse<any>>('/works?page=0&size=100'),
        apiRequest<PaginatedResponse<any>>('/tickets?page=0&size=100'),
      ]);

      const works = worksRes.content || [];
      const tickets = ticketsRes.content || [];

      // Calculate counts
      const completedWorks = works.filter((w: any) => w.status === 'CLOSED' || w.status === 'INVOICED');
      const pendingWorks = works.filter((w: any) => w.status === 'SCHEDULED' || w.status === 'IN_PROGRESS');

      // Count works by status
      const workStatusCounts = works.reduce((acc: any[], work: any) => {
        const existing = acc.find((w) => w.status === work.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: work.status, count: 1 });
        }
        return acc;
      }, []);

      // Count tickets by status
      const ticketStatusCounts = tickets.reduce((acc: any[], ticket: any) => {
        const existing = acc.find((t) => t.status === ticket.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: ticket.status, count: 1 });
        }
        return acc;
      }, []);

      // Get recent works (sorted by orderDate descending)
      const recentWorks = works
        .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        .slice(0, limit);

      // Get recent tickets (sorted by createdAt descending)
      const recentTickets = tickets
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return {
        clientCount: clientsRes.totalElements || 0,
        plantCount: plantsRes.totalElements || 0,
        completedWorkCount: completedWorks.length,
        pendingWorkCount: pendingWorks.length,
        workStatusCounts,
        ticketStatusCounts,
        recentWorks,
        recentTickets,
      };
    } catch (restError) {
      console.error('Dashboard REST fallback error:', restError);
      // Return empty data as last resort
      return {
        clientCount: 0,
        plantCount: 0,
        completedWorkCount: 0,
        pendingWorkCount: 0,
        workStatusCounts: [],
        ticketStatusCounts: [],
        recentWorks: [],
        recentTickets: [],
      };
    }
  },
};

// Worksite References API
export const worksiteReferencesApi = {
  getAll: () => apiRequest<any[]>('/worksite-references'),
  getById: (id: string) => apiRequest<any>(`/worksite-references/${id}`),
  create: (data: { name: string }) =>
    apiRequest<any>('/worksite-references', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string }) =>
    apiRequest<any>(`/worksite-references/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/worksite-references/${id}`, { method: 'DELETE' }),
};

// Access Logs API
export const accessLogsApi = {
  getAll: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiRequest<any>(`/access-logs?${searchParams.toString()}`);
  },
};

// Attachments API
export const attachmentsApi = {
  getByTarget: (targetType: string, targetId: string) =>
    apiRequest<any[]>(`/attachments/${targetType}/${targetId}`),

  upload: async (targetType: string, targetId: string, file: File) => {
    const token = getAuthToken();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/attachments/${targetType}/${targetId}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload attachment');
    }

    return response.json();
  },

  delete: (attachmentId: string) =>
    apiRequest<void>(`/attachments/${attachmentId}`, { method: 'DELETE' }),
};

// Rapportini API (authenticated)
export const rapportiniApi = {
  getAll: (filters: RapportiniFilters = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<RapportinoListItem>>(`/rapportini${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<RapportinoDetail>(`/rapportini/${id}`),
  getChecklistTemplate: () => apiRequest<ChecklistTemplateItem[]>('/rapportini/checklist-template'),
  create: (data: RapportinoCreateRequest) =>
    apiRequest<RapportinoDetail>('/rapportini', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: RapportinoUpdateRequest) =>
    apiRequest<RapportinoDetail>(`/rapportini/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/rapportini/${id}`, { method: 'DELETE' }),
  sign: (id: string, data: RapportinoSignRequest) =>
    apiRequest<RapportinoDetail>(`/rapportini/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  requestSignature: (id: string, expiresInMinutes: number) =>
    apiRequest<SignatureRequestCreated>(`/rapportini/${id}/signature-request`, {
      method: 'POST',
      body: JSON.stringify({ expiresInMinutes }),
    }),
  revokeSignatureRequest: (id: string) =>
    apiRequest<RapportinoDetail>(`/rapportini/${id}/signature-request/revoke`, { method: 'POST' }),
  void: (id: string) =>
    apiRequest<RapportinoDetail>(`/rapportini/${id}/void`, { method: 'POST' }),

  // The PDF is served only through the authenticated endpoint (never a storage URL)
  getPdfBlob: async (id: string): Promise<Blob> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/rapportini/${id}/pdf`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      throw new Error(i18n.t('reports:messages.pdfError', { defaultValue: 'Unable to download the document' }));
    }
    return response.blob();
  },
};

// Public signing API: used by the unauthenticated /sign/:token page.
// Deliberately separate from apiRequest: it never attaches the JWT and never redirects to /login.
export class PublicSigningError extends Error {
  constructor(public readonly kind: 'invalid' | 'rateLimited' | 'validation' | 'server') {
    super(kind);
  }
}

const publicRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 404) throw new PublicSigningError('invalid');
    if (response.status === 429) throw new PublicSigningError('rateLimited');
    if (response.status === 400) throw new PublicSigningError('validation');
    throw new PublicSigningError('server');
  }
  return response.json() as Promise<T>;
};

export const publicSigningApi = {
  getPreview: (token: string) =>
    publicRequest<PublicRapportinoPreview>(`/public/rapportini/sign/${encodeURIComponent(token)}`),
  sign: (token: string, data: RapportinoSignRequest) =>
    publicRequest<{ status: string }>(`/public/rapportini/sign/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
