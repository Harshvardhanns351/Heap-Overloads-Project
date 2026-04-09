const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

export const buildApiUrl = (path) =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const buildAssetUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
};

export const authHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

const getHeaders = () => {
  return {
    ...authHeaders(),
    'Content-Type': 'application/json',
  };
};

const handleResponse = async (resp) => {
  if (resp.status === 401) {
    // Only redirect if we had a token — prevents redirect loops on missing token
    const hadToken = !!localStorage.getItem('token');
    if (hadToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!resp.ok) {
    const contentType = resp.headers.get('content-type') || '';
    let detail = '';

    if (contentType.includes('application/json')) {
      const err = await resp.json().catch(() => ({}));
      detail = Array.isArray(err.detail)
        ? err.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
        : (err.detail || err.message || '');
    } else {
      detail = await resp.text().catch(() => '');
    }

    if (!detail) {
      detail = `HTTP ${resp.status} ${resp.statusText || 'Request failed'}`;
    }
    throw new Error(detail);
  }
  return resp.json();
};

export const api = {
  auth: {
    login: (email, password) => 
      fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(handleResponse),
      
    me: () => fetch(buildApiUrl('/auth/me'), { headers: getHeaders() }).then(handleResponse),

    signup: (name, email, password) =>
      fetch(buildApiUrl('/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }).then(handleResponse),

    sendMagicLink: (email) =>
      fetch(buildApiUrl('/auth/magic-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(handleResponse),

    forgotPassword: (email) =>
      fetch(buildApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(handleResponse),

    resetPassword: (token, password) =>
      fetch(buildApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }).then(handleResponse),

    selectRole: (role) =>
      fetch(buildApiUrl('/auth/select-role'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      }).then(handleResponse),
    
    seed: () => fetch(buildApiUrl('/auth/seed-demo'), { 
      method: 'POST', 
      headers: getHeaders() 
    }).then(handleResponse),
  },
  
  roadmap: {
    getMe: () => fetch(buildApiUrl('/roadmap/me'), { headers: getHeaders() }).then(handleResponse),
    updateNode: (id, status) => fetch(buildApiUrl(`/roadmap/nodes/${id}`), {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    }).then(handleResponse),
    regenerate: () => fetch(buildApiUrl('/roadmap/regenerate'), {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
  },
  
  students: {
    list: () => fetch(buildApiUrl('/users/'), { headers: getHeaders() }).then(handleResponse),
    get: (id) => fetch(buildApiUrl(`/users/${id}`), { headers: getHeaders() }).then(handleResponse),
  },
  
  assignments: {
    list: () => fetch(buildApiUrl('/assignments/'), { headers: getHeaders() }).then(handleResponse),
  },
  
  marks: {
    getMine: () => fetch(buildApiUrl('/marks/me'), { headers: getHeaders() }).then(handleResponse),
  },
  
  disputes: {
    create: (category, title, description) => fetch(buildApiUrl('/disputes'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, title, description }),
    }).then(handleResponse),
    listMine: () => fetch(buildApiUrl('/disputes/mine'), { headers: getHeaders() }).then(handleResponse),
    listAll: (status) => fetch(buildApiUrl(`/disputes${status ? `?status=${status}` : ''}`), { headers: getHeaders() }).then(handleResponse),
    updateStatus: (id, status, resolution) => fetch(buildApiUrl(`/disputes/${id}/status`), {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, resolution }),
    }).then(handleResponse),
  },
  
  attendance: {
    bulkUpload: (classId, day, records) => fetch(buildApiUrl('/attendance/bulk-upload'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ class_id: classId, day, records }),
    }).then(handleResponse),
    getClass: (classId, day) => fetch(buildApiUrl(`/attendance/class/${classId}${day ? `?day=${day}` : ''}`), { headers: getHeaders() }).then(handleResponse),
    getDefaulters: (classId) => fetch(buildApiUrl(`/attendance/defaulters/${classId}`), { headers: getHeaders() }).then(handleResponse),
    export: (classId) => fetch(buildApiUrl(`/attendance/export/${classId}`), { headers: getHeaders() }).then(handleResponse),
  },
  
  alerts: {
    listMine: () => fetch(buildApiUrl('/alerts/mine'), { headers: getHeaders() }).then(handleResponse),
    markRead: (id) => fetch(buildApiUrl(`/alerts/${id}/read`), { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
  },
  
  riskScores: {
    getMine: () => fetch(buildApiUrl('/risk-scores/me'), { headers: getHeaders() }).then(handleResponse),
  },
  
  coding: {
    getProfile: () => fetch(buildApiUrl('/coding/profile'), { headers: getHeaders() }).then(handleResponse),
    sync: () => fetch(buildApiUrl('/coding/sync'), { method: 'POST', headers: getHeaders() }).then(handleResponse),
  },

  users: {
    updateGoal: (goal, semester, branch) => fetch(buildApiUrl('/roadmap/goal'), {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ goal, semester, branch }),
    }).then(handleResponse),
  },
  
  monitoring: {
    logEvent: (eventType, studentId) => fetch(buildApiUrl('/monitoring/events'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ event_type: eventType, student_id: studentId }),
    }).then(handleResponse),
  },

  analytics: {
    getClassAverage: (classId) => fetch(buildApiUrl(`/analytics/class-average/${classId}`), { headers: getHeaders() }).then(handleResponse),
    getMyRadar: () => fetch(buildApiUrl('/analytics/my-radar'), { headers: getHeaders() }).then(handleResponse),
  },

  sprints: {
    start: (nodeId) => fetch(buildApiUrl('/sprints/start'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ node_id: nodeId }),
    }).then(handleResponse),
    complete: (sprintId) => fetch(buildApiUrl(`/sprints/${sprintId}/complete`), {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
    getActive: () => fetch(buildApiUrl('/sprints/active'), { headers: getHeaders() }).then(handleResponse),
    getStats: () => fetch(buildApiUrl('/sprints/stats'), { headers: getHeaders() }).then(handleResponse),
  },

  exams: {
    list: (classId) => fetch(buildApiUrl(`/exams${classId ? `?class_id=${classId}` : ''}`), { headers: getHeaders() }).then(handleResponse),
    create: (subject, examDate, classId) => fetch(buildApiUrl('/exams'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subject, exam_date: examDate, class_id: classId }),
    }).then(handleResponse),
    getRevisionPlan: (examId, subject, examDate) => {
      let url = buildApiUrl('/exams/revision-plan?');
      if (examId) url += `exam_id=${examId}`;
      else if (subject && examDate) url += `subject=${subject}&exam_date=${examDate}`;
      return fetch(url, { headers: getHeaders() }).then(handleResponse);
    },
  },

  peerNotes: {
    create: (classId, subject, topic, content) => fetch(buildApiUrl('/peer-notes'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ class_id: classId, subject, topic, content }),
    }).then(handleResponse),
    list: (classId, subject, topic) => {
      let url = buildApiUrl('/peer-notes?');
      if (classId) url += `class_id=${classId}&`;
      if (subject) url += `subject=${subject}&`;
      if (topic) url += `topic=${topic}&`;
      return fetch(url, { headers: getHeaders() }).then(handleResponse);
    },
    vote: (noteId) => fetch(buildApiUrl(`/peer-notes/${noteId}/vote`), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ upvote: true }),
    }).then(handleResponse),
    listPending: () => fetch(buildApiUrl('/peer-notes/pending'), { headers: getHeaders() }).then(handleResponse),
    moderate: (noteId, approved) => fetch(buildApiUrl(`/peer-notes/${noteId}/moderate?approved=${approved}`), {
      method: 'PATCH',
      headers: getHeaders(),
    }).then(handleResponse),
  },

  digest: {
    getClassDigest: (classId) => fetch(buildApiUrl(`/digest/digest/${classId}`), { headers: getHeaders() }).then(handleResponse),
  },
};
