import { create } from 'zustand';
import { api } from './api';

// Kept for StudentDetail legacy reference — will be removed once fully migrated
export const MOCK_STUDENTS = [];

// ── Token validation helper ───────────────────────────────────────────────────
function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry with 30s buffer
    return payload.exp && payload.exp > (Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

function getStoredAuth() {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user || !isTokenValid(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      return { user: null, role: null };
    }
    return { user, role: localStorage.getItem('role') || user.role };
  } catch {
    return { user: null, role: null };
  }
}

const useAppStore = create((set, get) => ({
  // Auth — validated on startup, stale tokens cleared immediately
  currentUser: getStoredAuth().user,
  role: getStoredAuth().role,
  isInitializing: false,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    set({ currentUser: user, role: user.role });
  },

  login: async (email, password) => {
    const data = await api.auth.login(email, password);
    get().setAuth(data.user, data.access_token);
    return data.user;
  },

  logout: () => {
    localStorage.clear();
    set({ currentUser: null, role: null });
    window.location.href = '/login';
  },

  // Roadmap
  roadmapNodes: [],
  expandedNode: null,
  setExpandedNode: (id) => set((s) => ({ expandedNode: s.expandedNode === id ? null : id })),

  fetchRoadmap: async () => {
    try {
      const data = await api.roadmap.getMe();
      // Support both {roadmap: {nodes}, nodes} shapes
      const nodes = data.nodes || data.roadmap?.nodes || [];
      set({ roadmapNodes: nodes });
    } catch (err) {
      console.error('Failed to fetch roadmap', err);
    }
  },

  markNodeComplete: async (id) => {
    try {
      await api.roadmap.updateNode(id, 'completed');
      await get().fetchRoadmap();
    } catch (err) {
      console.error('Failed to update node', err);
    }
  },

  // Students (teacher/admin view)
  students: [],
  fetchStudents: async () => {
    try {
      const data = await api.students.list();
      set({ students: data });
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  },

  // Assignments
  assignments: [],
  fetchAssignments: async () => {
    try {
      const data = await api.assignments.list();
      set({ assignments: data });
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  },

  // Chat
  chatMessages: [
    { role: 'assistant', content: "Hi! I'm your AI mentor. I can help with your roadmap, explain concepts, or analyse your performance. What's on your mind?" }
  ],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  // Disputes
  disputes: [],
  fetchDisputes: async () => {
    try {
      const role = get().role;
      const data = role === 'admin'
        ? await api.disputes.listAll()
        : await api.disputes.listMine();
      set({ disputes: data });
    } catch (err) {
      console.error('Failed to fetch disputes', err);
    }
  },

  createDispute: async (category, title, description) => {
    try {
      await api.disputes.create(category, title, description);
      await get().fetchDisputes();
    } catch (err) {
      console.error('Failed to create dispute', err);
      throw err;
    }
  },

  updateDisputeStatus: async (id, status, resolution) => {
    try {
      await api.disputes.updateStatus(id, status, resolution);
      await get().fetchDisputes();
    } catch (err) {
      console.error('Failed to update dispute', err);
      throw err;
    }
  },

  deleteDispute: async (id) => {
    try {
      await api.disputes.remove(id);
      await get().fetchDisputes();
    } catch (err) {
      console.error('Failed to delete dispute', err);
      throw err;
    }
  },

  // Alerts
  alerts: [],
  fetchAlerts: async () => {
    try {
      const data = await api.alerts.listMine();
      set({ alerts: data });
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  },

  markAlertRead: async (id) => {
    try {
      await api.alerts.markRead(id);
      await get().fetchAlerts();
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  },

  // Attendance
  attendance: [],
  defaulters: [],
  fetchAttendance: async (classId) => {
    try {
      const data = await api.attendance.getClass(classId);
      set({ attendance: data });
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  },

  fetchDefaulters: async (classId) => {
    try {
      const data = await api.attendance.getDefaulters(classId);
      set({ defaulters: data });
    } catch (err) {
      console.error('Failed to fetch defaulters', err);
    }
  },

  // Risk Score
  riskScore: null,
  fetchRiskScore: async () => {
    try {
      const data = await api.riskScores.getMine();
      set({ riskScore: data });
    } catch (err) {
      console.error('Failed to fetch risk score', err);
    }
  },

  // Marks
  marks: [],
  fetchMarks: async () => {
    try {
      const data = await api.marks.getMine();
      set({ marks: data });
    } catch (err) {
      console.error('Failed to fetch marks', err);
    }
  },

  // Sprints
  activeSprint: null,
  sprintStats: null,
  startSprint: async (nodeId) => {
    try {
      const data = await api.sprints.start(nodeId);
      set({ activeSprint: data });
      return data;
    } catch (err) {
      console.error('Failed to start sprint', err);
      throw err;
    }
  },
  completeSprint: async (sprintId) => {
    try {
      await api.sprints.complete(sprintId);
      set({ activeSprint: null });
      await get().fetchSprintStats();
    } catch (err) {
      console.error('Failed to complete sprint', err);
      throw err;
    }
  },
  fetchSprintStats: async () => {
    try {
      const data = await api.sprints.getStats();
      set({ sprintStats: data });
    } catch (err) {
      console.error('Failed to fetch sprint stats', err);
    }
  },
  checkActiveSprint: async () => {
    try {
      const data = await api.sprints.getActive();
      set({ activeSprint: data });
    } catch (err) {
      console.error('Failed to check active sprint', err);
    }
  },

  // Exams
  exams: [],
  revisionPlan: null,
  fetchExams: async () => {
    try {
      const data = await api.exams.list();
      set({ exams: data });
    } catch (err) {
      console.error('Failed to fetch exams', err);
    }
  },
  fetchRevisionPlan: async (examId, subject, examDate) => {
    try {
      const data = await api.exams.getRevisionPlan(examId, subject, examDate);
      set({ revisionPlan: data });
      return data;
    } catch (err) {
      console.error('Failed to fetch revision plan', err);
      throw err;
    }
  },

  // Analytics
  radarData: null,
  fetchRadarData: async () => {
    try {
      const data = await api.analytics.getMyRadar();
      set({ radarData: data });
    } catch (err) {
      console.error('Failed to fetch radar data', err);
    }
  },

  // Peer Notes
  peerNotes: [],
  fetchPeerNotes: async (classId, subject, topic) => {
    try {
      const data = await api.peerNotes.list(classId, subject, topic);
      set({ peerNotes: data });
    } catch (err) {
      console.error('Failed to fetch peer notes', err);
    }
  },
  createPeerNote: async (classId, subject, topic, content) => {
    try {
      await api.peerNotes.create(classId, subject, topic, content);
      await get().fetchPeerNotes(classId, subject, topic);
    } catch (err) {
      console.error('Failed to create peer note', err);
      throw err;
    }
  },

  // Class Digest
  classDigest: null,
  fetchClassDigest: async (classId) => {
    try {
      const data = await api.digest.getClassDigest(classId);
      set({ classDigest: data });
    } catch (err) {
      console.error('Failed to fetch class digest', err);
    }
  },

  // Coding
  codingSummary: null,
  fetchCodingSummary: async () => {
    try {
      const data = await api.coding.getSummary();
      set({ codingSummary: data });
    } catch (err) {
      console.error('Failed to fetch coding summary', err);
    }
  },

  velorisScore: null,
  fetchVelorisScore: async () => {
    try {
      const data = await api.coding.getScore();
      set({ velorisScore: data });
    } catch (err) {
      console.error('Failed to fetch veloris score', err);
    }
  },

  leaderboard: [],
  leaderboardLoading: false,
  fetchLeaderboard: async () => {
    set({ leaderboardLoading: true });
    try {
      const data = await api.coding.getLeaderboard();
      set({ leaderboard: data.leaderboard || [] });
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      set({ leaderboardLoading: false });
    }
  },

  // Profile
  profile: null,
  profileLoading: false,
  fetchProfile: async () => {
    set({ profileLoading: true });
    try {
      const data = await api.profile.getMyProfile();
      set({ profile: data, profileLoading: false });
    } catch { set({ profileLoading: false }); }
  },
  updateProfileLocal: (updates) =>
    set(s => ({ profile: s.profile ? { ...s.profile, user: { ...s.profile.user, ...updates } } : s.profile })),

  // Student list (teacher/admin)
  studentsList: [],
  studentsListLoading: false,
  fetchStudentsList: async (params = {}) => {
    set({ studentsListLoading: true });
    try {
      const data = await api.profile.getStudentsList(params);
      set({ studentsList: data.students || [], studentsListLoading: false });
    } catch { set({ studentsListLoading: false }); }
  },

  // Initialization
  initialize: async () => {
    const role = get().role;
    if (!role) return;
    if (role === 'student') {
      await get().fetchRoadmap();
      await get().fetchAssignments();
    } else if (role === 'teacher') {
      await get().fetchStudents();
      await get().fetchAlerts();
    } else if (role === 'admin') {
      await get().fetchStudents();
      await get().fetchDisputes();
    }
  },
}));

export default useAppStore;
export { useAppStore };
