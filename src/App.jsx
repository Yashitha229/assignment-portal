import React, { useState, useEffect } from 'react';
import './App.css';

const KEY = "assignment-portal-v1";
const SEED = {
  assignments: [
    { id: 1, course: "Web Development", title: "Build a personal portfolio", desc: "Create a responsive portfolio with HTML, CSS and JavaScript. Upload a .zip of your project.", due: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 16), max: 100 },
    { id: 2, course: "Databases", title: "ER diagram for a library system", desc: "Submit an ER diagram as PDF or image.", due: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 16), max: 50 },
    { id: 3, course: "Algorithms", title: "Sorting analysis report", desc: "Compare merge sort and quicksort with timing results.", due: new Date(Date.now() - 864e5).toISOString().slice(0, 16), max: 100 }
  ],
  submissions: []
};

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return saved ? JSON.parse(saved) : SEED;
    } catch (e) {
      return SEED;
    }
  });

  const [role, setRole] = useState('student');
  const [view, setView] = useState({ name: 'list', id: null });
  const [pendingFile, setPendingFile] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Form inputs for Teacher assignment creation
  const [newCourse, setNewCourse] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newMax, setNewMax] = useState(100);

  // Temporary state for teacher feedback/grading
  const [grades, setGrades] = useState({});
  const [feedbacks, setFeedbacks] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }, [state]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const size = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const mine = (aid) => state.submissions.find(s => s.aid === aid);

  const getStatus = (a) => {
    const s = mine(a.id);
    const late = new Date(a.due) < new Date();
    if (s && s.grade != null) return ['Graded: ' + s.grade + '/' + a.max, 't-ok'];
    if (s) return ['Submitted', 't-ok'];
    return late ? ['Overdue', 't-bad'] : ['Not submitted', 't-warn'];
  };

  const handleFilePick = (file) => {
    if (!file) return;
    if (file.size > 10485760) {
      showToast("File is over 10 MB. Choose a smaller file.");
      return;
    }
    setPendingFile(file);
  };

  const handleSubmitWork = (aid) => {
    if (!pendingFile) {
      showToast("Choose a file before submitting.");
      return;
    }
    const filteredSubs = state.submissions.filter(s => s.aid !== aid);
    const newSub = {
      aid,
      student: "You",
      name: pendingFile.name,
      size: pendingFile.size,
      note: noteText,
      at: new Date().toISOString(),
      grade: null,
      feedback: ''
    };
    setState({ ...state, submissions: [...filteredSubs, newSub] });
    setPendingFile(null);
    setNoteText('');
    showToast("Assignment submitted");
  };

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    if (!newCourse || !newTitle || !newDue) return;
    const newA = {
      id: Date.now(),
      course: newCourse,
      title: newTitle,
      desc: newDesc,
      due: newDue,
      max: Number(newMax) || 100
    };
    setState({ ...state, assignments: [...state.assignments, newA] });
    setNewCourse('');
    setNewTitle('');
    setNewDesc('');
    setNewDue('');
    setNewMax(100);
    showToast("Assignment created");
  };

  const handleSaveGrade = (sub, maxMarks) => {
    const g = grades[sub.aid + '_' + sub.student];
    const f = feedbacks[sub.aid + '_' + sub.student] ?? sub.feedback ?? '';
    if (g === undefined || g === "" || Number(g) < 0 || Number(g) > maxMarks) {
      showToast("Enter a grade between 0 and " + maxMarks);
      return;
    }
    const updatedSubs = state.submissions.map(s => {
      if (s.aid === sub.aid && s.student === sub.student) {
        return { ...s, grade: Number(g), feedback: f };
      }
      return s;
    });
    setState({ ...state, submissions: updatedSubs });
    showToast("Grade saved");
  };

  const activeAssignment = state.assignments.find(a => a.id === view.id);

  return (
    <div>
      <header>
        <h1>Assignment Portal</h1>
        <div className="seg" role="group" aria-label="View as">
          <button 
            aria-pressed={role === 'student'} 
            onClick={() => { setRole('student'); setView({ name: 'list', id: null }); }}
          >
            Student
          </button>
          <button 
            aria-pressed={role === 'teacher'} 
            onClick={() => { setRole('teacher'); setView({ name: 'list', id: null }); }}
          >
            Teacher
          </button>
        </div>
      </header>

      <main id="app">
        {role === 'student' ? (
          view.name === 'list' ? (
            <>
              <h2>Your assignments</h2>
              <p className="sub">Open an assignment to read the brief and upload your work.</p>
              <div className="list">
                {state.assignments.map(a => {
                  const [statusText, statusClass] = getStatus(a);
                  return (
                    <div className="row" key={a.id}>
                      <div>
                        <h3>{a.title}</h3>
                        <div className="meta">{a.course} · Due {fmt(a.due)}</div>
                      </div>
                      <div>
                        <span className={`tag ${statusClass}`}>{statusText}</span>{' '}
                        <button className="btn ghost" onClick={() => setView({ name: 'detail', id: a.id })}>Open</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button className="back" onClick={() => setView({ name: 'list', id: null })}>Back to assignments</button>
              <h2>{activeAssignment?.title}</h2>
              <p className="sub">{activeAssignment?.course} · Due {fmt(activeAssignment?.due)} · {activeAssignment?.max} marks</p>
              <div className="panel">
                <p style={{ margin: 0 }}>{activeAssignment?.desc}</p>
              </div>
              {(() => {
                const s = mine(activeAssignment.id);
                const late = new Date(activeAssignment.due) < new Date();
                return (
                  <>
                    {s && (
                      <div className="panel">
                        <strong>Your submission</strong>
                        <p className="meta">{s.name} ({size(s.size)}) · sent {fmt(s.at)}</p>
                        {s.grade != null ? (
                          <>
                            <p><span className="tag t-ok">{s.grade}/{activeAssignment.max}</span></p>
                            <p>{s.feedback || "No written feedback."}</p>
                          </>
                        ) : (
                          <p className="meta">Waiting for your teacher to grade it.</p>
                        )}
                      </div>
                    )}
                    {!late && !(s && s.grade != null) && (
                      <div className="panel">
                        <strong>{s ? "Replace your file" : "Upload your work"}</strong>
                        <div 
                          className="drop" 
                          onClick={() => document.getElementById('file-input').click()}
                        >
                          {pendingFile ? `${pendingFile.name} (${size(pendingFile.size)})` : "Drop a file here or click to choose one"}
                        </div>
                        <input 
                          type="file" 
                          id="file-input" 
                          hidden 
                          onChange={(e) => handleFilePick(e.target.files[0])} 
                        />
                        <label htmlFor="note">Note to teacher (optional)</label>
                        <textarea 
                          id="note" 
                          rows="3" 
                          value={noteText} 
                          onChange={(e) => setNoteText(e.target.value)} 
                        />
                        <div className="actions">
                          <button className="btn" onClick={() => handleSubmitWork(activeAssignment.id)}>
                            {s ? "Resubmit" : "Submit assignment"}
                          </button>
                        </div>
                      </div>
                    )}
                    {late && !s && (
                      <div className="panel t-bad">The deadline has passed. Contact your teacher to ask for an extension.</div>
                    )}
                  </>
                );
              })()}
            </>
          )
        ) : (
          view.name === 'list' ? (
            <>
              <h2>Teacher dashboard</h2>
              <p className="sub">Create assignments and grade what students send in.</p>
              <div className="panel">
                <strong>New assignment</strong>
                <form onSubmit={handleCreateAssignment}>
                  <div className="grid2">
                    <div>
                      <label>Course</label>
                      <input type="text" value={newCourse} onChange={e => setNewCourse(e.target.value)} required />
                    </div>
                    <div>
                      <label>Title</label>
                      <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
                    </div>
                  </div>
                  <label>Instructions</label>
                  <textarea rows="3" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <div className="grid2">
                    <div>
                      <label>Deadline</label>
                      <input type="datetime-local" value={newDue} onChange={e => setNewDue(e.target.value)} required />
                    </div>
                    <div>
                      <label>Total marks</label>
                      <input type="number" value={newMax} min="1" onChange={e => setNewMax(e.target.value)} />
                    </div>
                  </div>
                  <div className="actions">
                    <button className="btn" type="submit">Create assignment</button>
                  </div>
                </form>
              </div>
              <div className="list">
                {state.assignments.map(a => {
                  const subs = state.submissions.filter(s => s.aid === a.id);
                  const graded = subs.filter(s => s.grade != null);
                  return (
                    <div className="row" key={a.id}>
                      <div>
                        <h3>{a.title}</h3>
                        <div className="meta">{a.course} · Due {fmt(a.due)} · {subs.length} submitted, {graded.length} graded</div>
                      </div>
                      <button className="btn ghost" onClick={() => setView({ name: 'detail', id: a.id })}>Review</button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button className="back" onClick={() => setView({ name: 'list', id: null })}>Back to dashboard</button>
              <h2>{activeAssignment?.title}</h2>
              <p className="sub">{activeAssignment?.course} · Due {fmt(activeAssignment?.due)}</p>
              <div className="panel">
                {state.submissions.filter(s => s.aid === activeAssignment.id).length === 0 ? (
                  <div className="empty">No submissions yet.</div>
                ) : (
                  state.submissions.filter(s => s.aid === activeAssignment.id).map((s, i) => {
                    const key = `${s.aid}_${s.student}`;
                    return (
                      <div className="sub-item" key={i}>
                        <strong>{s.student}</strong> <span className="meta">{s.name} ({size(s.size)}) · {fmt(s.at)}</span>
                        {s.note && <p className="meta">Note: {s.note}</p>}
                        <div className="grid2">
                          <div>
                            <label>Grade (out of {activeAssignment.max})</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={activeAssignment.max} 
                              value={grades[key] ?? s.grade ?? ''} 
                              onChange={e => setGrades({ ...grades, [key]: e.target.value })} 
                            />
                          </div>
                          <div>
                            <label>Feedback</label>
                            <input 
                              type="text" 
                              value={feedbacks[key] ?? s.feedback ?? ''} 
                              onChange={e => setFeedbacks({ ...feedbacks, [key]: e.target.value })} 
                            />
                          </div>
                        </div>
                        <div className="actions">
                          <button className="btn" onClick={() => handleSaveGrade(s, activeAssignment.max)}>Save grade</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )
        )}
      </main>
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">{toastMsg}</div>
    </div>
  );
}