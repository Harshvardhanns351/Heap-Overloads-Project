const API_BASE = 'http://localhost:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const err = await resp.json().catch(() => ({ detail: 'Unknown error' }));
    // FastAPI 422 returns detail as an array of validation errors
    const detail = Array.isArray(err.detail)
      ? err.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
      : (err.detail || 'API error');
    throw new Error(detail);
  }
  return resp.json();
};

export const api = {
  auth: {
    login: (email, password) => 
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(handleResponse),
      
    me: () => fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse),
    
    seed: () => fetch(`${API_BASE}/auth/seed-demo`, { 
      method: 'POST', 
      headers: getHeaders() 
    }).then(handleResponse),
  },
  
  roadmap: {
    getMe: () => fetch(`${API_BASE}/roadmap/me`, { headers: getHeaders() }).then(handleResponse),
    updateNode: (id, status) => fetch(`${API_BASE}/roadmap/nodes/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    }).then(handleResponse),
    regenerate: () => fetch(`${API_BASE}/roadmap/regenerate`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
  },
  
  students: {
    list: () => fetch(`${API_BASE}/users/`, { headers: getHeaders() }).then(handleResponse),
    get: (id) => fetch(`${API_BASE}/users/${id}`, { headers: getHeaders() }).then(handleResponse),
  },
  
  assignments: {
    list: () => fetch(`${API_BASE}/assignments/`, { headers: getHeaders() }).then(handleResponse),
    create: (payload) => fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),
    update: (id, payload) => fetch(`${API_BASE}/assignments/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),
    remove: (id) => fetch(`${API_BASE}/assignments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then((resp) => {
      if (resp.status === 204) return null;
      return handleResponse(resp);
    }),
    listSubmissions: (id) => fetch(`${API_BASE}/assignments/${id}/submissions`, {
      headers: getHeaders(),
    }).then(handleResponse),
  },
  
  marks: {
    getMine: () => fetch(`${API_BASE}/marks/me`, { headers: getHeaders() }).then(handleResponse),
  },
  
  disputes: {
    create: (category, title, description) => fetch(`${API_BASE}/disputes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, title, description }),
    }).then(handleResponse),
    listMine: () => fetch(`${API_BASE}/disputes/mine`, { headers: getHeaders() }).then(handleResponse),
    listAll: (status) => fetch(`${API_BASE}/disputes${status ? `?status=${status}` : ''}`, { headers: getHeaders() }).then(handleResponse),
    updateStatus: (id, status, resolution) => fetch(`${API_BASE}/disputes/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, resolution }),
    }).then(handleResponse),
  },
  
  attendance: {
    bulkUpload: (classId, day, records) => fetch(`${API_BASE}/attendance/bulk-upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ class_id: classId, day, records }),
    }).then(handleResponse),
    getClass: (classId, day) => fetch(`${API_BASE}/attendance/class/${classId}${day ? `?day=${day}` : ''}`, { headers: getHeaders() }).then(handleResponse),
    getDefaulters: (classId) => fetch(`${API_BASE}/attendance/defaulters/${classId}`, { headers: getHeaders() }).then(handleResponse),
    export: (classId) => fetch(`${API_BASE}/attendance/export/${classId}`, { headers: getHeaders() }).then(handleResponse),
    importReport: (file) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/attendance/report/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      }).then(handleResponse);
    },
    exportReport: async (format, rows, sourceFile) => {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/attendance/report/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ format, rows, source_file: sourceFile }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(err.detail || 'Export failed');
      }
      return {
        blob: await resp.blob(),
        filename: resp.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] || `attendance_defaulters.${format}`,
      };
    },
  },
  
  alerts: {
    listMine: () => fetch(`${API_BASE}/alerts/mine`, { headers: getHeaders() }).then(handleResponse),
    markRead: (id) => fetch(`${API_BASE}/alerts/${id}/read`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
  },
  
  riskScores: {
    getMine: () => fetch(`${API_BASE}/risk-scores/me`, { headers: getHeaders() }).then(handleResponse),
  },
  
  coding: {
    getProfiles: () => fetch(`${API_BASE}/coding/me`, { headers: getHeaders() }).then(handleResponse),
    getSummary: () => fetch(`${API_BASE}/coding/me/summary`, { headers: getHeaders() }).then(handleResponse),
    getScore: () => fetch(`${API_BASE}/coding/me/score`, { headers: getHeaders() }).then(handleResponse),
    getHeatmap: () => fetch(`${API_BASE}/coding/me/heatmap`, { headers: getHeaders() }).then(handleResponse),
    getStudentHeatmap: (userId) => fetch(`${API_BASE}/coding/heatmap/${userId}`, { headers: getHeaders() }).then(handleResponse),
    getLeaderboard: () => fetch(`${API_BASE}/coding/leaderboard`, { headers: getHeaders() }).then(handleResponse),
    syncLeetcode: (username) => fetch(`${API_BASE}/coding/leetcode/${username}`, { headers: getHeaders() }).then(handleResponse),
    syncGithub: (username) => fetch(`${API_BASE}/coding/github/${username}`, { headers: getHeaders() }).then(handleResponse),
    syncCodeforces: (handle) => fetch(`${API_BASE}/coding/codeforces/${handle}`, { headers: getHeaders() }).then(handleResponse),
    syncCodechef: (username) => fetch(`${API_BASE}/coding/codechef/${username}`, { headers: getHeaders() }).then(handleResponse),
  },

  users: {
    updateGoal: (goal, semester, branch) => fetch(`${API_BASE}/roadmap/goal`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ goal, semester, branch }),
    }).then(handleResponse),
  },
  
  monitoring: {
    logEvent: (eventType, studentId) => fetch(`${API_BASE}/monitoring/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ event_type: eventType, student_id: studentId }),
    }).then(handleResponse),
  },

  analytics: {
    getClassAverage: (classId) => fetch(`${API_BASE}/analytics/class-average/${classId}`, { headers: getHeaders() }).then(handleResponse),
    getMyRadar: () => fetch(`${API_BASE}/analytics/my-radar`, { headers: getHeaders() }).then(handleResponse),
  },

  sprints: {
    start: (nodeId) => fetch(`${API_BASE}/sprints/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ node_id: nodeId }),
    }).then(handleResponse),
    complete: (sprintId) => fetch(`${API_BASE}/sprints/${sprintId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handleResponse),
    getActive: () => fetch(`${API_BASE}/sprints/active`, { headers: getHeaders() }).then(handleResponse),
    getStats: () => fetch(`${API_BASE}/sprints/stats`, { headers: getHeaders() }).then(handleResponse),
  },

  exams: {
    list: (classId) => fetch(`${API_BASE}/exams${classId ? `?class_id=${classId}` : ''}`, { headers: getHeaders() }).then(handleResponse),
    create: (subject, examDate, classId) => fetch(`${API_BASE}/exams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subject, exam_date: examDate, class_id: classId }),
    }).then(handleResponse),
    getRevisionPlan: (examId, subject, examDate) => {
      let url = `${API_BASE}/exams/revision-plan?`;
      if (examId) url += `exam_id=${examId}`;
      else if (subject && examDate) url += `subject=${subject}&exam_date=${examDate}`;
      return fetch(url, { headers: getHeaders() }).then(handleResponse);
    },
  },

  peerNotes: {
    create: (classId, subject, topic, content) => fetch(`${API_BASE}/peer-notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ class_id: classId, subject, topic, content }),
    }).then(handleResponse),
    list: (classId, subject, topic) => {
      let url = `${API_BASE}/peer-notes?`;
      if (classId) url += `class_id=${classId}&`;
      if (subject) url += `subject=${subject}&`;
      if (topic) url += `topic=${topic}&`;
      return fetch(url, { headers: getHeaders() }).then(handleResponse);
    },
    vote: (noteId) => fetch(`${API_BASE}/peer-notes/${noteId}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ upvote: true }),
    }).then(handleResponse),
    listPending: () => fetch(`${API_BASE}/peer-notes/pending`, { headers: getHeaders() }).then(handleResponse),
    moderate: (noteId, approved) => fetch(`${API_BASE}/peer-notes/${noteId}/moderate?approved=${approved}`, {
      method: 'PATCH',
      headers: getHeaders(),
    }).then(handleResponse),
  },

  digest: {
    getClassDigest: (classId) => fetch(`${API_BASE}/digest/digest/${classId}`, { headers: getHeaders() }).then(handleResponse),
  },

  profile: {
    getMyProfile: () => fetch(`${API_BASE}/profile/me`, { headers: getHeaders() }).then(handleResponse),
    updateMyProfile: (data) => fetch(`${API_BASE}/profile/me`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    getStudentProfile: (userId) => fetch(`${API_BASE}/profile/student/${userId}`, { headers: getHeaders() }).then(handleResponse),
    getStudentsList: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/profile/students/list${q ? `?${q}` : ''}`, { headers: getHeaders() }).then(handleResponse);
    },
    getMyInternships: () => fetch(`${API_BASE}/profile/me/internships`, { headers: getHeaders() }).then(handleResponse),
    addInternship: (data) => fetch(`${API_BASE}/profile/me/internships`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    updateInternship: (id, data) => fetch(`${API_BASE}/profile/me/internships/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    deleteInternship: (id) => fetch(`${API_BASE}/profile/me/internships/${id}`, { method: 'DELETE', headers: getHeaders() }).then(r => { if (!r.ok && r.status !== 204) throw new Error('Delete failed'); }),
    verifyInternship: (id) => fetch(`${API_BASE}/profile/internship/${id}/verify`, { method: 'PATCH', headers: getHeaders() }).then(handleResponse),
  },
};
