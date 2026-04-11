import React, { useEffect, useMemo, useState } from 'react';
import useAppStore from '../../store';
import { api } from '../../api';
import { EmptyState, Modal, PageHeader, Tabs } from '../../components/UI';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Timer,
} from 'lucide-react';

const SUBJECT_OPTIONS = ['DSA', 'OS', 'DBMS', 'CN', 'ML'];
const CLASS_OPTIONS = ['CSE-A', 'CSE-B'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const SMART_STORAGE_KEY = 'teacher-assignment-smart-v1';
const EMPTY_FORM = {
  title: '',
  subject: 'DSA',
  description: '',
  deadline: '',
  class_id: 'CSE-A',
  tags: '',
  priority: 'medium',
};

const readSmartState = () => {
  try {
    return JSON.parse(localStorage.getItem(SMART_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const parseTags = (value) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const formatCountdown = (deadline) => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff)) return 'No deadline';
  if (diff <= 0) return 'Deadline passed';
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
  return `${hours}h ${minutes}m remaining`;
};

const toPayload = (form) => ({
  title: form.title,
  subject: form.subject,
  description: form.description,
  class_id: form.class_id,
  deadline: new Date(form.deadline).toISOString(),
});

const downloadTextFile = (filename, content, type = 'application/json') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function SmartStat({ label, value, sub, tone = '#8b5cf6' }) {
  return (
    <div className="card" style={{ padding: '18px', minWidth: '180px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '10px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: tone, marginBottom: '6px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

function AssignmentForm({ form, setForm, onSubmit, saving, submitLabel }) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Title</label>
        <input className="input" placeholder="Assignment title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Subject</label>
          <select className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
            {SUBJECT_OPTIONS.map((subject) => <option key={subject}>{subject}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Class</label>
          <select className="input" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
            {CLASS_OPTIONS.map((classId) => <option key={classId}>{classId}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Deadline</label>
        <input className="input" type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} required />
      </div>
      <div>
        <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Tags</label>
        <input className="input" placeholder="placements, lab, sprint-3" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
      </div>
      <div>
        <label style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Description</label>
        <textarea className="input" rows={4} placeholder="Assignment instructions..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? submitLabel.replace('Save', 'Saving').replace('Create', 'Creating') : submitLabel}
      </button>
    </form>
  );
}

export default function TeacherAssignments() {
  const { assignments, students, fetchAssignments, fetchStudents } = useAppStore();
  const [tab, setTab] = useState('list');
  const [displayMode, setDisplayMode] = useState('list');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingForm, setEditingForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [viewMode, setViewMode] = useState('view');
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [smartState, setSmartState] = useState(readSmartState);

  const persistSmartState = (updater) => {
    setSmartState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      localStorage.setItem(SMART_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const getMeta = (assignmentId) => smartState[assignmentId] || { priority: 'medium', tags: [], feedbacks: {} };

  const setAssignmentMeta = (assignmentId, patch) => {
    persistSmartState((current) => ({
      ...current,
      [assignmentId]: {
        priority: 'medium',
        tags: [],
        feedbacks: {},
        ...(current[assignmentId] || {}),
        ...patch,
      },
    }));
  };

  const setSubmissionFeedback = (assignmentId, submissionId, patch) => {
    persistSmartState((current) => {
      const assignmentMeta = current[assignmentId] || { priority: 'medium', tags: [], feedbacks: {} };
      return {
        ...current,
        [assignmentId]: {
          ...assignmentMeta,
          feedbacks: {
            ...(assignmentMeta.feedbacks || {}),
            [submissionId]: {
              ...((assignmentMeta.feedbacks || {})[submissionId] || {}),
              ...patch,
            },
          },
        },
      };
    });
  };

  useEffect(() => {
    Promise.all([fetchAssignments(), fetchStudents()]).finally(() => setLoading(false));
  }, [fetchAssignments, fetchStudents]);

  useEffect(() => {
    let cancelled = false;
    const loadSubmissions = async () => {
      if (assignments.length === 0) {
        setSubmissionsByAssignment({});
        return;
      }
      setLoadingSubmissions(true);
      try {
        const entries = await Promise.all(assignments.map(async (assignment) => {
          try {
            const data = await api.assignments.listSubmissions(assignment.id);
            return [assignment.id, data];
          } catch {
            return [assignment.id, []];
          }
        }));
        if (!cancelled) {
          setSubmissionsByAssignment(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setLoadingSubmissions(false);
      }
    };

    loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [assignments]);

  const assignmentSummaries = useMemo(() => {
    return Object.fromEntries(assignments.map((assignment) => {
      const classStudents = students.filter((student) => student.role === 'student' && student.class_id === assignment.class_id);
      const latestByStudent = new Map();
      (submissionsByAssignment[assignment.id] || []).forEach((submission) => {
        const existing = latestByStudent.get(submission.student_id);
        if (!existing || new Date(submission.submitted_at) > new Date(existing.submitted_at)) {
          latestByStudent.set(submission.student_id, submission);
        }
      });
      const latestSubmissions = Array.from(latestByStudent.values());
      const lateCount = latestSubmissions.filter((submission) => submission.status === 'late').length;
      const submittedIds = new Set(latestSubmissions.map((submission) => submission.student_id));
      const missingStudents = classStudents.filter((student) => !submittedIds.has(student.id));
      const assignmentMeta = getMeta(assignment.id);
      const marks = latestSubmissions
        .map((submission) => Number((assignmentMeta.feedbacks || {})[submission.id]?.marks))
        .filter((value) => Number.isFinite(value));
      const avgMarks = marks.length ? (marks.reduce((sum, value) => sum + value, 0) / marks.length) : null;
      const rosterCount = classStudents.length;
      const submissionRate = rosterCount ? Math.round((latestSubmissions.length / rosterCount) * 100) : 0;
      return [assignment.id, {
        classStudents,
        latestSubmissions,
        missingStudents,
        lateCount,
        avgMarks,
        submissionRate,
        rosterCount,
        submittedCount: latestSubmissions.length,
      }];
    }));
  }, [assignments, students, submissionsByAssignment, smartState]);

  const allTags = useMemo(() => {
    const tags = new Set();
    assignments.forEach((assignment) => {
      (getMeta(assignment.id).tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [assignments, smartState]);

  const getDaysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: '#ef4444' };
    if (diff === 0) return { text: 'Due today', color: '#f59e0b' };
    return { text: `${diff}d left`, color: diff < 2 ? '#f59e0b' : 'var(--text-muted)' };
  };

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...assignments]
      .filter((assignment) => {
        const meta = getMeta(assignment.id);
        const summary = assignmentSummaries[assignment.id] || { missingStudents: [], lateCount: 0, submittedCount: 0, rosterCount: 0 };
        const tags = meta.tags || [];
        const matchesSearch = !term || [assignment.title, assignment.subject, assignment.description, assignment.class_id, ...tags].filter(Boolean).join(' ').toLowerCase().includes(term);
        const matchesClass = classFilter === 'all' || assignment.class_id === classFilter;
        const matchesSubject = subjectFilter === 'all' || assignment.subject === subjectFilter;
        const matchesPriority = priorityFilter === 'all' || (meta.priority || 'medium') === priorityFilter;
        const matchesTag = tagFilter === 'all' || tags.includes(tagFilter);
        const isLate = summary.lateCount > 0;
        const hasMissing = summary.missingStudents.length > 0;
        const isSubmitted = summary.rosterCount > 0 && summary.submittedCount === summary.rosterCount;
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'late' && isLate)
          || (statusFilter === 'not_submitted' && hasMissing)
          || (statusFilter === 'submitted' && isSubmitted)
          || (statusFilter === 'active' && !isLate && !isSubmitted);
        return matchesSearch && matchesClass && matchesSubject && matchesPriority && matchesTag && matchesStatus;
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }, [assignments, search, classFilter, subjectFilter, priorityFilter, tagFilter, statusFilter, assignmentSummaries, smartState]);

  const analytics = useMemo(() => {
    if (filteredAssignments.length === 0) {
      return { submissionRate: 0, avgMarks: 0, lateCount: 0, riskAlerts: 0 };
    }
    const totals = filteredAssignments.reduce((acc, assignment) => {
      const summary = assignmentSummaries[assignment.id] || { submissionRate: 0, avgMarks: null, lateCount: 0, missingStudents: [] };
      acc.submissionRate += summary.submissionRate;
      if (summary.avgMarks !== null) {
        acc.avgMarksTotal += summary.avgMarks;
        acc.avgMarksCount += 1;
      }
      acc.lateCount += summary.lateCount;
      acc.riskAlerts += summary.missingStudents.length;
      return acc;
    }, { submissionRate: 0, avgMarksTotal: 0, avgMarksCount: 0, lateCount: 0, riskAlerts: 0 });

    return {
      submissionRate: Math.round(totals.submissionRate / filteredAssignments.length),
      avgMarks: totals.avgMarksCount ? (totals.avgMarksTotal / totals.avgMarksCount).toFixed(1) : '—',
      lateCount: totals.lateCount,
      riskAlerts: totals.riskAlerts,
    };
  }, [filteredAssignments, assignmentSummaries]);

  const openAssignment = (assignment, mode = 'view') => {
    const meta = getMeta(assignment.id);
    setSelectedAssignment(assignment);
    setViewMode(mode);
    setEditingForm({
      title: assignment.title || '',
      subject: assignment.subject || SUBJECT_OPTIONS[0],
      description: assignment.description || '',
      deadline: toDateTimeLocal(assignment.deadline),
      class_id: assignment.class_id || CLASS_OPTIONS[0],
      priority: meta.priority || 'medium',
      tags: (meta.tags || []).join(', '),
    });
  };

  const closeModal = () => {
    setSelectedAssignment(null);
    setViewMode('view');
  };

  const syncMetaFromForm = (assignmentId, values) => {
    setAssignmentMeta(assignmentId, {
      priority: values.priority || 'medium',
      tags: parseTags(values.tags || ''),
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const createdAssignment = await api.assignments.create(toPayload(form));
      syncMetaFromForm(createdAssignment.id, form);
      await fetchAssignments();
      setForm(EMPTY_FORM);
      setCreated(true);
      setTimeout(() => {
        setCreated(false);
        setTab('list');
      }, 1800);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setUpdating(true);
    try {
      const updated = await api.assignments.update(selectedAssignment.id, toPayload(editingForm));
      syncMetaFromForm(updated.id, editingForm);
      await fetchAssignments();
      setSelectedAssignment(updated);
      setViewMode('view');
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    const confirmed = window.confirm(`Delete "${selectedAssignment.title}"? This will also remove its submissions.`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.assignments.remove(selectedAssignment.id);
      persistSmartState((current) => {
        const next = { ...current };
        delete next[selectedAssignment.id];
        return next;
      });
      await fetchAssignments();
      closeModal();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedAssignment) return;
    setDuplicating(true);
    try {
      const meta = getMeta(selectedAssignment.id);
      const duplicated = await api.assignments.create({
        title: `${selectedAssignment.title} Copy`,
        subject: selectedAssignment.subject,
        description: selectedAssignment.description,
        class_id: selectedAssignment.class_id,
        deadline: new Date(selectedAssignment.deadline).toISOString(),
      });
      setAssignmentMeta(duplicated.id, {
        priority: meta.priority || 'medium',
        tags: meta.tags || [],
        feedbacks: {},
      });
      await fetchAssignments();
      openAssignment(duplicated, 'edit');
    } catch (err) {
      alert(`Duplicate failed: ${err.message}`);
    } finally {
      setDuplicating(false);
    }
  };

  const extendDeadline = async (days) => {
    if (!selectedAssignment) return;
    const nextDeadline = new Date(selectedAssignment.deadline);
    nextDeadline.setDate(nextDeadline.getDate() + days);
    setUpdating(true);
    try {
      const updated = await api.assignments.update(selectedAssignment.id, {
        title: selectedAssignment.title,
        subject: selectedAssignment.subject,
        description: selectedAssignment.description,
        class_id: selectedAssignment.class_id,
        deadline: nextDeadline.toISOString(),
      });
      await fetchAssignments();
      setSelectedAssignment(updated);
    } catch (err) {
      alert(`Unable to extend deadline: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const exportBundle = (assignment) => {
    const summary = assignmentSummaries[assignment.id] || { latestSubmissions: [], missingStudents: [] };
    const feedbacks = getMeta(assignment.id).feedbacks || {};
    const payload = {
      assignment,
      submissions: summary.latestSubmissions.map((submission) => ({
        ...submission,
        feedback: feedbacks[submission.id] || null,
      })),
      missing_students: summary.missingStudents,
      exported_at: new Date().toISOString(),
    };
    downloadTextFile(`assignment-${assignment.id}-bundle.json`, JSON.stringify(payload, null, 2));
  };

  const selectedSummary = selectedAssignment ? (assignmentSummaries[selectedAssignment.id] || { latestSubmissions: [], missingStudents: [], lateCount: 0, submissionRate: 0, avgMarks: null, rosterCount: 0, submittedCount: 0 }) : null;
  const selectedMeta = selectedAssignment ? getMeta(selectedAssignment.id) : { priority: 'medium', tags: [], feedbacks: {} };

  const calendarGroups = useMemo(() => {
    return filteredAssignments.reduce((acc, assignment) => {
      const key = new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      acc[key] = acc[key] || [];
      acc[key].push(assignment);
      return acc;
    }, {});
  }, [filteredAssignments]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Assignments"
        subtitle="Create, review, and update assignments across your classes"
        action={<button className="btn btn-primary" onClick={() => setTab('create')} style={{ fontSize: '12px' }}><Plus size={13} /> Create</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <SmartStat label="Submission Rate" value={`${analytics.submissionRate}%`} sub="Across current filter set" tone="#8b5cf6" />
        <SmartStat label="Average Marks" value={analytics.avgMarks} sub="Based on inline grading" tone="#22c55e" />
        <SmartStat label="Late Count" value={analytics.lateCount} sub="Latest submissions marked late" tone="#f59e0b" />
        <SmartStat label="Risk Alerts" value={analytics.riskAlerts} sub="Students who still have not submitted" tone="#ef4444" />
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) repeat(5, minmax(120px, 1fr)) auto', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: '36px' }} placeholder="Search title, tags, class or subject" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All status</option>
            <option value="submitted">Fully submitted</option>
            <option value="not_submitted">Missing submissions</option>
            <option value="late">Late</option>
            <option value="active">Active</option>
          </select>
          <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">All classes</option>
            {CLASS_OPTIONS.map((classId) => <option key={classId} value={classId}>{classId}</option>)}
          </select>
          <select className="input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">All subjects</option>
            {SUBJECT_OPTIONS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select className="input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All priority</option>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          <select className="input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="all">All tags</option>
            {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn" type="button" onClick={() => setDisplayMode('list')} style={{ opacity: displayMode === 'list' ? 1 : 0.7 }}>List</button>
            <button className="btn" type="button" onClick={() => setDisplayMode('calendar')} style={{ opacity: displayMode === 'calendar' ? 1 : 0.7 }}><CalendarDays size={14} /> Calendar</button>
          </div>
        </div>
      </div>

      <Tabs tabs={[{ key: 'list', label: 'All Assignments' }, { key: 'create', label: 'Create New' }]} active={tab} onChange={setTab} />

      {tab === 'list' && displayMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredAssignments.length === 0 && <EmptyState icon={Filter} title="No assignments match these filters" desc="Try widening your filters or create a new assignment." />}
          {filteredAssignments.map((assignment) => {
            const summary = assignmentSummaries[assignment.id] || { latestSubmissions: [], missingStudents: [], lateCount: 0, submissionRate: 0, avgMarks: null, rosterCount: 0, submittedCount: 0 };
            const meta = getMeta(assignment.id);
            const { text, color } = getDaysLeft(assignment.deadline);
            const countdown = formatCountdown(assignment.deadline);
            return (
              <div key={assignment.id} className="card" style={{ padding: '18px 20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                    <div style={{ width: '44px', height: '44px', background: 'rgba(79,142,247,0.12)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={18} color="#4f8ef7" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '700' }}>{assignment.title}</span>
                        <span className="badge-blue" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px' }}>{assignment.subject}</span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', borderRadius: '999px', padding: '2px 8px', background: meta.priority === 'high' ? 'rgba(239,68,68,0.14)' : meta.priority === 'medium' ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)', color: meta.priority === 'high' ? '#fda4af' : meta.priority === 'medium' ? '#fcd34d' : '#86efac' }}>{meta.priority || 'medium'} priority</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{assignment.class_id}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.6 }}>
                        {assignment.description || 'No instructions added yet.'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {(meta.tags || []).map((tag) => (
                          <span key={tag} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '999px', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.18)' }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ color, display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12} /> {text}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Timer size={12} /> {countdown}</span>
                        <span>{summary.submittedCount}/{summary.rosterCount || 0} submitted</span>
                        <span>{summary.lateCount} late</span>
                        <span>{summary.avgMarks !== null ? `${summary.avgMarks.toFixed(1)} avg marks` : 'No grading yet'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn" type="button" onClick={() => openAssignment(assignment, 'view')}><Eye size={14} /> View</button>
                    <button className="btn btn-primary" type="button" onClick={() => openAssignment(assignment, 'edit')}><PencilLine size={14} /> Edit</button>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Submission Rate</div>
                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{summary.submissionRate}%</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Missing Students</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: summary.missingStudents.length ? '#fda4af' : '#86efac' }}>{summary.missingStudents.length}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Deadline</div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{new Date(assignment.deadline).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'list' && displayMode === 'calendar' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          {Object.keys(calendarGroups).length === 0 && <EmptyState icon={CalendarDays} title="Calendar is clear" desc="No assignments match the current filters." />}
          {Object.entries(calendarGroups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="card" style={{ padding: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <CalendarDays size={15} color="#a78bfa" />
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{dateLabel}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {items.map((assignment) => {
                  const summary = assignmentSummaries[assignment.id] || { missingStudents: [], lateCount: 0, submissionRate: 0 };
                  return (
                    <button key={assignment.id} type="button" onClick={() => openAssignment(assignment, 'view')} style={{ textAlign: 'left', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>{assignment.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{assignment.subject} • {assignment.class_id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{summary.submissionRate}% submitted • {summary.missingStudents.length} pending • {summary.lateCount} late</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'create' && (
        <div className="card" style={{ padding: '24px', maxWidth: '640px' }}>
          {created ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600' }}>Assignment created!</div>
            </div>
          ) : (
            <AssignmentForm form={form} setForm={setForm} onSubmit={handleCreate} saving={creating} submitLabel="Create Assignment" />
          )}
        </div>
      )}

      <Modal open={!!selectedAssignment} onClose={closeModal} title={viewMode === 'edit' ? 'Edit Assignment' : 'Assignment Details'}>
        {selectedAssignment && selectedSummary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {viewMode === 'edit' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <AssignmentForm form={editingForm} setForm={setEditingForm} onSubmit={handleUpdate} saving={updating} submitLabel="Save Changes" />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deleting will remove this assignment and all submissions tied to it.</div>
                  <button className="btn" type="button" onClick={handleDelete} disabled={deleting || updating} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
                    {deleting ? 'Deleting...' : 'Delete Assignment'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>{selectedAssignment.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge-blue">{selectedAssignment.subject}</span>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', borderRadius: '999px', padding: '2px 8px', background: selectedMeta.priority === 'high' ? 'rgba(239,68,68,0.14)' : selectedMeta.priority === 'medium' ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)', color: selectedMeta.priority === 'high' ? '#fda4af' : selectedMeta.priority === 'medium' ? '#fcd34d' : '#86efac' }}>{selectedMeta.priority || 'medium'} priority</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedAssignment.class_id}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn" type="button" onClick={() => exportBundle(selectedAssignment)}><Download size={14} /> Bulk Download</button>
                      <button className="btn" type="button" onClick={handleDuplicate} disabled={duplicating}><Copy size={14} /> {duplicating ? 'Duplicating...' : 'Duplicate'}</button>
                      <button className="btn btn-primary" type="button" onClick={() => setViewMode('edit')}><PencilLine size={14} /> Edit Assignment</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {(selectedMeta.tags || []).map((tag) => (
                      <span key={tag} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '999px', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.18)' }}>{tag}</span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Submission Rate</div>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>{selectedSummary.submissionRate}%</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Average Marks</div>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>{selectedSummary.avgMarks !== null ? selectedSummary.avgMarks.toFixed(1) : '—'}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Late Count</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: selectedSummary.lateCount ? '#fcd34d' : 'white' }}>{selectedSummary.lateCount}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Risk Alerts</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: selectedSummary.missingStudents.length ? '#fda4af' : '#86efac' }}>{selectedSummary.missingStudents.length}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}><CalendarDays size={14} /> Deadline: {new Date(selectedAssignment.deadline).toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}><Timer size={14} /> {formatCountdown(selectedAssignment.deadline)}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn" type="button" onClick={() => extendDeadline(1)} disabled={updating}>Extend +1 day</button>
                      <button className="btn" type="button" onClick={() => extendDeadline(3)} disabled={updating}>Extend +3 days</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}><FileText size={14} style={{ marginTop: '3px' }} /><span>{selectedAssignment.description || 'No description provided.'}</span></div>
                  </div>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Submission Status Tracker</div>
                  {loadingSubmissions && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading submissions...</div>}
                  {!loadingSubmissions && selectedSummary.latestSubmissions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No submissions yet for this assignment.</div>}
                  {!loadingSubmissions && selectedSummary.latestSubmissions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedSummary.latestSubmissions.map((submission) => {
                        const feedback = (selectedMeta.feedbacks || {})[submission.id] || {};
                        return (
                          <div key={submission.id} style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{submission.student_name || `Student #${submission.student_id}`}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Submitted {new Date(submission.submitted_at).toLocaleString()}</div>
                              </div>
                              <div style={{ textTransform: 'capitalize', fontSize: '11px', color: submission.status === 'late' ? '#f59e0b' : '#22c55e', fontWeight: '700' }}>{submission.status}</div>
                            </div>
                            {submission.text && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{submission.text}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                              <input className="input" type="number" min="0" max="100" placeholder="Marks" value={feedback.marks || ''} onChange={(e) => setSubmissionFeedback(selectedAssignment.id, submission.id, { marks: e.target.value })} />
                              <input className="input" placeholder="Inline feedback / comment" value={feedback.comment || ''} onChange={(e) => setSubmissionFeedback(selectedAssignment.id, submission.id, { comment: e.target.value })} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: '18px', border: '1px solid rgba(239,68,68,0.16)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>
                    <AlertTriangle size={16} color="#f87171" /> Risk Alerts
                  </div>
                  {selectedSummary.missingStudents.length === 0 ? (
                    <div style={{ color: '#86efac', fontSize: '13px' }}>Everyone in this class has submitted.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedSummary.missingStudents.map((student) => (
                        <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '12px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{student.name}</div>
                            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>{student.email}</div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#fecaca', maxWidth: '300px', textAlign: 'right' }}>Not submitted yet. Consider a reminder if the countdown is under 24 hours or the deadline has already passed.</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
