import { create } from 'zustand';

// Mock data for all roles
export const MOCK_STUDENTS = [
  {
    id: 1, name: 'Rahul Sharma', email: 'rahul@college.edu', rollNo: 'CS21001',
    riskScore: 82, riskLevel: 'red', attendance: 62, lastActive: '5 days ago',
    semester: 6, branch: 'CSE', section: 'A',
    marks: { DSA: 72, OS: 58, DBMS: 81, CN: 63, ML: 45 },
    marksHistory: [
      { test: 'Unit 1', DSA: 78, OS: 70, DBMS: 85 },
      { test: 'Unit 2', DSA: 72, OS: 58, DBMS: 81 },
    ],
    codingStats: { leetcode: 'rahul_sharma_dev', solved: 87, easy: 52, medium: 30, hard: 5, streak: 0 },
    assignedTeacher: 'Dr. Priya Menon',
    nudge: "It's been a few days — even a 10-minute revision session counts. Want to pick up where you left off?",
    tags: ['Late Night Submitter', 'Attendance Drop'],
  },
  {
    id: 2, name: 'Sneha Patel', email: 'sneha@college.edu', rollNo: 'CS21002',
    riskScore: 45, riskLevel: 'yellow', attendance: 78, lastActive: '1 day ago',
    semester: 6, branch: 'CSE', section: 'A',
    marks: { DSA: 88, OS: 74, DBMS: 69, CN: 82, ML: 77 },
    marksHistory: [
      { test: 'Unit 1', DSA: 90, OS: 78, DBMS: 72 },
      { test: 'Unit 2', DSA: 88, OS: 74, DBMS: 69 },
    ],
    codingStats: { leetcode: 'sneha_codes', solved: 234, easy: 120, medium: 98, hard: 16, streak: 14 },
    assignedTeacher: 'Dr. Priya Menon',
    nudge: null,
    tags: ['Marks Dipping'],
  },
  {
    id: 3, name: 'Arjun Nair', email: 'arjun@college.edu', rollNo: 'CS21003',
    riskScore: 22, riskLevel: 'green',  attendance: 91, lastActive: 'Today',
    semester: 6, branch: 'CSE', section: 'A',
    marks: { DSA: 94, OS: 88, DBMS: 91, CN: 87, ML: 93 },
    marksHistory: [
      { test: 'Unit 1', DSA: 91, OS: 85, DBMS: 89 },
      { test: 'Unit 2', DSA: 94, OS: 88, DBMS: 91 },
    ],
    codingStats: { leetcode: 'arjun_cp', solved: 412, easy: 180, medium: 190, hard: 42, streak: 32 },
    assignedTeacher: 'Dr. Priya Menon',
    nudge: null,
    tags: ['Top Performer'],
  },
  {
    id: 4, name: 'Divya Krishnan', email: 'divya@college.edu', rollNo: 'CS21004',
    riskScore: 68, riskLevel: 'yellow', attendance: 71, lastActive: '2 days ago',
    semester: 6, branch: 'CSE', section: 'A',
    marks: { DSA: 63, OS: 55, DBMS: 74, CN: 68, ML: 59 },
    marksHistory: [
      { test: 'Unit 1', DSA: 70, OS: 65, DBMS: 78 },
      { test: 'Unit 2', DSA: 63, OS: 55, DBMS: 74 },
    ],
    codingStats: { leetcode: 'divya_k', solved: 45, easy: 38, medium: 7, hard: 0, streak: 3 },
    assignedTeacher: 'Dr. Priya Menon',
    nudge: "Your DBMS is trending well — want to tackle CN next? It's your placement weak spot.",
    tags: ['Attendance Drop', 'Marks Dipping'],
  },
  {
    id: 5, name: 'Kiran Reddy', email: 'kiran@college.edu', rollNo: 'CS21005',
    riskScore: 18, riskLevel: 'green', attendance: 94, lastActive: 'Today',
    semester: 6, branch: 'CSE', section: 'B',
    marks: { DSA: 89, OS: 92, DBMS: 87, CN: 85, ML: 88 },
    marksHistory: [
      { test: 'Unit 1', DSA: 86, OS: 89, DBMS: 84 },
      { test: 'Unit 2', DSA: 89, OS: 92, DBMS: 87 },
    ],
    codingStats: { leetcode: 'kiran_dev', solved: 320, easy: 150, medium: 140, hard: 30, streak: 45 },
    assignedTeacher: 'Prof. Ramesh Kumar',
    nudge: null,
    tags: ['Consistent Performer'],
  },
];

export const MOCK_ROADMAP = [
  { id: 1, title: 'Arrays & Strings', type: 'concept', hours: 8, status: 'completed', description: 'Master array manipulation, two-pointer and sliding window techniques.', resources: ['GFG Arrays', 'LeetCode Array Explore'], prereqs: [] },
  { id: 2, title: 'Linked Lists', type: 'concept', hours: 6, status: 'completed', description: 'Singly, doubly, circular. Reverse, detect cycle, merge sorted lists.', resources: ['GFG Linked List', 'Striver A2Z'], prereqs: [1] },
  { id: 3, title: 'Binary Search Trees', type: 'concept', hours: 8, status: 'current', description: 'BST operations, height-balanced trees, segment trees intro.', resources: ['MIT OCW Trees', 'CP-Algorithms BST'], prereqs: [2] },
  { id: 4, title: 'Graph Fundamentals', type: 'concept', hours: 12, status: 'upcoming', description: 'BFS, DFS, cycle detection, topological sort, shortest paths.', resources: ['William Fiset Graphs', 'GFG Graph'], prereqs: [3] },
  { id: 5, title: 'DP — 1D & 2D', type: 'concept', hours: 15, status: 'upcoming', description: 'Memoization to tabulation. LCS, Knapsack, DP on grids.', resources: ['Striver DP Series', 'Aditya Verma DP'], prereqs: [4] },
  { id: 6, title: 'System Design Basics', type: 'project', hours: 10, status: 'upcoming', description: 'URL shortener, rate limiter, consistent hashing. For placements.', resources: ['Gaurav Sen Channel', 'System Design Primer'], prereqs: [5] },
];

export const MOCK_ASSIGNMENTS = [
  { id: 1, title: 'Graph Traversal Problems', subject: 'DSA', deadline: '2026-04-01T23:59:00', status: 'pending', submissionRate: 68, class: 'CSE-A' },
  { id: 2, title: 'ER Diagram — Hospital DB', subject: 'DBMS', deadline: '2026-03-30T23:59:00', status: 'submitted', submissionRate: 92, class: 'CSE-A', submittedAt: '2026-03-29T02:14:00', isLate: false },
  { id: 3, title: 'Process Scheduling Simulation', subject: 'OS', deadline: '2026-03-28T23:59:00', status: 'late', submissionRate: 45, class: 'CSE-A', submittedAt: '2026-03-29T03:41:00', isLate: true },
  { id: 4, title: 'TCP/IP Layer Analysis', subject: 'CN', deadline: '2026-04-05T23:59:00', status: 'pending', submissionRate: 0, class: 'CSE-A' },
];

export const MOCK_DISPUTES = [
  { id: 1, studentName: 'Rahul Sharma', category: 'Infrastructure', title: 'Projector not working in Lab 3', description: 'The projector in Lab 3 has not been working for 2 weeks. It is affecting practical classes.', status: 'Open', date: '2026-03-25', evidence: null },
  { id: 2, studentName: 'Sneha Patel', category: 'Academic', title: 'Marks not updated for Unit 2 test', description: 'My Unit 2 DBMS marks have not been updated in the portal even after 10 days.', status: 'In Review', date: '2026-03-22', resolution: null },
  { id: 3, studentName: 'Divya Krishnan', category: 'Administrative', title: 'Scholarship form deadline extension', description: 'I was unable to submit the scholarship form due to medical emergency. Requesting a one-week extension.', status: 'Resolved', date: '2026-03-18', resolution: 'Extension granted. Please submit by April 5th.' },
];

export const MOCK_CHAT_MESSAGES = [
  { role: 'assistant', content: "Hi Rahul! Based on your roadmap, you've marked Linked Lists as complete. **Binary Search Trees** would be the natural next step. Your CN marks suggest that's where we should focus energy before placements. Want me to walk through BST core concepts, or jump straight to practice problems?" },
];

const useAppStore = create((set) => ({
  // Auth
  currentUser: null,
  role: null,

  login: (role) => {
    const users = {
      student: { id: 1, name: 'Rahul Sharma', email: 'rahul@college.edu', role: 'student', avatar: 'RS' },
      teacher: { id: 10, name: 'Dr. Priya Menon', email: 'priya@college.edu', role: 'teacher', avatar: 'PM' },
      admin: { id: 20, name: 'Admin', email: 'admin@college.edu', role: 'admin', avatar: 'AD' },
    };
    set({ currentUser: users[role], role });
  },
  logout: () => set({ currentUser: null, role: null }),

  // Roadmap
  roadmapNodes: MOCK_ROADMAP,
  expandedNode: null,
  setExpandedNode: (id) => set((s) => ({ expandedNode: s.expandedNode === id ? null : id })),
  markNodeComplete: (id) => set((s) => ({
    roadmapNodes: s.roadmapNodes.map((n) => {
      if (n.id === id) return { ...n, status: 'completed' };
      if (n.prereqs.includes(id) && n.status === 'upcoming') return { ...n, status: 'current' };
      return n;
    }),
  })),

  // Chat
  chatMessages: MOCK_CHAT_MESSAGES,
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  // Disputes
  disputes: MOCK_DISPUTES,
  addDispute: (d) => set((s) => ({ disputes: [{ ...d, id: Date.now(), date: new Date().toISOString().split('T')[0], status: 'Open' }, ...s.disputes] })),
  updateDisputeStatus: (id, status, resolution) => set((s) => ({
    disputes: s.disputes.map((d) => d.id === id ? { ...d, status, resolution } : d),
  })),

  // Students (teacher view)
  students: MOCK_STUDENTS,

  // Assignments
  assignments: MOCK_ASSIGNMENTS,
}));

export default useAppStore;
