import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [role, setRole] = useState('student'); // 'student' or 'teacher'
  
  // Available Subjects
  const subjects = ['All Subjects', 'Web Development', 'React Programming', 'Database Systems'];
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

  // Dynamic Assignments State fetched from Supabase
  const [assignments, setAssignments] = useState([]);
  
  // Selected assignment for student submission
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // New Assignment Form State (Teacher View)
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Web Development');
  const [newDueDate, setNewDueDate] = useState('');

  // Student Form State (Persisted in localStorage so each student sees their own status)
  const [studentName, setStudentName] = useState(() => localStorage.getItem('portal_student_name') || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Save student name locally when changed
  const handleStudentNameChange = (name) => {
    setStudentName(name);
    localStorage.setItem('portal_student_name', name);
  };

  // Fetch both assignments and submissions from Supabase
  useEffect(() => {
    fetchData();
  }, [role]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchAssignments(), fetchSubmissions()]);
    setIsLoading(false);
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error.message);
      triggerToast('Failed to load assignments');
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error.message);
      triggerToast('Failed to load submissions');
    }
  };

  // Teacher: Save New Assignment to Supabase
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newId = `HW-${101 + assignments.length}`;
    const newAss = {
      id: newId,
      subject: newSubject,
      title: `${newId}: ${newTitle}`,
      due_date: newDueDate || 'No Due Date'
    };

    try {
      const { error } = await supabase
        .from('assignments')
        .insert([newAss]);

      if (error) throw error;

      triggerToast('New assignment published across all devices!');
      setNewTitle('');
      setNewDueDate('');
      fetchAssignments();
    } catch (error) {
      triggerToast('Failed to create assignment: ' + error.message);
    }
  };

  // Student: Submit File to Supabase
  const handleStudentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAssignment) {
      triggerToast('Please select an assignment first.');
      return;
    }
    if (!selectedFile) {
      triggerToast('Please attach a file to upload.');
      return;
    }
    if (!studentName.trim()) {
      triggerToast('Please enter your name.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('assignments')
        .upload(fileName, selectedFile);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('submissions')
        .insert([
          {
            student_name: studentName.trim(),
            assignment_id: selectedAssignment.id,
            file_url: urlData.publicUrl,
            file_name: selectedFile.name,
            status: 'Submitted',
            grade: 'Pending'
          },
        ]);

      if (dbError) throw dbError;

      triggerToast('Assignment submitted successfully!');
      
      setSelectedFile(null);
      setSelectedAssignment(null);
      fetchSubmissions();

    } catch (error) {
      console.error('Submission failed:', error.message);
      triggerToast(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Teacher: Grade Submission
  const handleGradeSubmission = async (submissionId, grade) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ grade: grade, status: 'Graded' })
        .eq('id', submissionId);

      if (error) throw error;
      triggerToast(`Grade updated to "${grade}"!`);
      fetchSubmissions();
    } catch (error) {
      triggerToast('Failed to update grade: ' + error.message);
    }
  };

  // Helper function to check status SPECIFIC to the current student name
  const getSubmissionForAssignment = (assignmentId) => {
    if (!studentName.trim()) {
      // If no student name is typed yet, fallback to latest overall submission for preview
      return submissions.find(s => s.assignment_id === assignmentId);
    }
    // Match both assignment_id AND student_name
    return submissions.find(
      s => s.assignment_id === assignmentId && 
           s.student_name.toLowerCase().trim() === studentName.toLowerCase().trim()
    );
  };

  const filteredAssignments = selectedSubject === 'All Subjects'
    ? assignments
    : assignments.filter(a => a.subject === selectedSubject);

  return (
    <div>
      <header>
        <h1>📚 Assignment Portal</h1>
        <div className="seg">
          <button 
            aria-pressed={role === 'student'} 
            onClick={() => { setRole('student'); setSelectedAssignment(null); }}
          >
            Student View
          </button>
          <button 
            aria-pressed={role === 'teacher'} 
            onClick={() => setRole('teacher')}
          >
            Teacher View
          </button>
        </div>
      </header>

      <main>
        {/* Subject Filter Bar */}
        <div className="panel" style={{ padding: '12px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Filter by Subject:</span>
            <div className="seg">
              {subjects.map(sub => (
                <button
                  key={sub}
                  aria-pressed={selectedSubject === sub}
                  onClick={() => setSelectedSubject(sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STUDENT VIEW */}
        {role === 'student' && (
          <div>
            {/* Student Name Identifer Bar */}
            <div className="panel" style={{ marginBottom: '20px', background: 'var(--surface)' }}>
              <label htmlFor="studentIdent">Your Name / Student ID:</label>
              <input
                id="studentIdent"
                type="text"
                placeholder="Enter your name to track your submissions (e.g. Yashitha)"
                value={studentName}
                onChange={(e) => handleStudentNameChange(e.target.value)}
              />
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                Type your name above so the status badges match your personal submissions.
              </small>
            </div>

            {!selectedAssignment ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Available Assignments</h2>
                  <button className="btn ghost" onClick={fetchData}>🔄 Sync</button>
                </div>
                <p className="sub">Track submission status and submit coursework per subject.</p>
                
                {filteredAssignments.length === 0 ? (
                  <div className="empty">No assignments published for this subject yet.</div>
                ) : (
                  <div className="list">
                    {filteredAssignments.map((ass) => {
                      const submission = getSubmissionForAssignment(ass.id);
                      return (
                        <div className="row" key={ass.id}>
                          <div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                              <span className="tag t-muted">{ass.subject}</span>
                              {submission ? (
                                submission.status === 'Graded' ? (
                                  <span className="tag t-ok">Graded: {submission.grade}</span>
                                ) : (
                                  <span className="tag t-warn">Submitted</span>
                                )
                              ) : (
                                <span className="tag t-bad">Not Submitted</span>
                              )}
                            </div>
                            <h3>{ass.title}</h3>
                            <div className="meta">Due Date: {ass.due_date || ass.dueDate}</div>
                          </div>
                          <div>
                            <button 
                              className="btn" 
                              onClick={() => setSelectedAssignment(ass)}
                            >
                              {submission ? 'Re-submit Work ➔' : 'Submit Work ➔'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button 
                  className="back" 
                  onClick={() => setSelectedAssignment(null)}
                >
                  ← Back to Assignments List
                </button>

                <h2>Submit: {selectedAssignment.title}</h2>
                <p className="sub">Subject: <strong>{selectedAssignment.subject}</strong></p>

                <div className="panel">
                  <form onSubmit={handleStudentSubmit}>
                    <label htmlFor="studentNameInput">Your Name</label>
                    <input
                      id="studentNameInput"
                      type="text"
                      placeholder="e.g. Yashitha"
                      value={studentName}
                      onChange={(e) => handleStudentNameChange(e.target.value)}
                      required
                    />

                    <label>Attach File</label>
                    <div 
                      className={`drop ${isDragOver ? 'over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                      }}
                      onClick={() => document.getElementById('fileInput').click()}
                    >
                      <input
                        id="fileInput"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                      {selectedFile ? (
                        <div>
                          <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </div>
                      ) : (
                        <div>
                          📁 Drag & drop your assignment file here, or <span style={{ textDecoration: 'underline' }}>browse</span>
                        </div>
                      )}
                    </div>

                    <div className="actions">
                      <button type="submit" className="btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Uploading to Supabase...' : 'Submit Work'}
                      </button>
                      <button 
                        type="button" 
                        className="btn ghost" 
                        onClick={() => setSelectedAssignment(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEACHER VIEW */}
        {role === 'teacher' && (
          <div>
            <h2>Teacher Dashboard</h2>
            <p className="sub">Publish assignments by subject and grade student submissions.</p>

            <div className="panel">
              <h3>Create New Assignment</h3>
              <form onSubmit={handleCreateAssignment}>
                <div className="grid2">
                  <div>
                    <label htmlFor="assTitle">Assignment Title</label>
                    <input 
                      id="assTitle" 
                      type="text" 
                      placeholder="e.g. Building REST APIs" 
                      value={newTitle} 
                      onChange={(e) => setNewTitle(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label htmlFor="assSubject">Subject Category</label>
                    <select 
                      id="assSubject" 
                      value={newSubject} 
                      onChange={(e) => setNewSubject(e.target.value)}
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="React Programming">React Programming</option>
                      <option value="Database Systems">Database Systems</option>
                    </select>
                  </div>
                </div>
                <div className="grid2" style={{ marginTop: '10px' }}>
                  <div>
                    <label htmlFor="assDueDate">Due Date</label>
                    <input 
                      id="assDueDate" 
                      type="date" 
                      value={newDueDate} 
                      onChange={(e) => setNewDueDate(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="actions">
                  <button type="submit" className="btn">Publish Assignment</button>
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
              <h3>Student Submissions</h3>
              <button className="btn ghost" onClick={fetchData}>
                🔄 Refresh Submissions
              </button>
            </div>

            {isLoading ? (
              <div className="empty">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="empty">No submissions found in Supabase.</div>
            ) : (
              <div className="list">
                {submissions.map((item) => (
                  <div className="row" key={item.id}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="tag t-muted">ID: {item.assignment_id}</span>
                        <span className={`tag ${item.status === 'Graded' ? 't-ok' : 't-warn'}`}>
                          {item.status || 'Submitted'} {item.grade ? `(${item.grade})` : ''}
                        </span>
                      </div>
                      <h3>{item.student_name}</h3>
                      <div className="meta">
                        Submitted: {new Date(item.created_at).toLocaleString()} • File: <strong>{item.file_name}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                        <button className="btn ghost">
                          📥 View File
                        </button>
                      </a>
                      
                      <select 
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        value={item.grade || 'Pending'}
                        onChange={(e) => handleGradeSubmission(item.id, e.target.value)}
                      >
                        <option value="Pending">Grade: Pending</option>
                        <option value="A+">Grade: A+</option>
                        <option value="A">Grade: A</option>
                        <option value="B">Grade: B</option>
                        <option value="C">Grade: C</option>
                        <option value="Needs Revision">Needs Revision</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
}

export default App;