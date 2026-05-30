import React, { useState, useEffect } from "react";

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [deckFile, setDeckFile] = useState(null);
  const [meetingId, setMeetingId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipelineData, setPipelineData] = useState(null);
  // State to manage which analytics tab is active
  const [activeTab, setActiveTab] = useState("timeline");

  // Poll the backend status endpoint while processing
  useEffect(() => {
    let intervalId;

    if (meetingId && loading) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/status/${meetingId}`);
          const data = await res.json();
          
          const progress = data.progress;
          if (typeof progress === "object" && progress.status === "completed") {
            setStatus("Success! Processing complete.");
            setPipelineData(progress);
            setLoading(false);
            clearInterval(intervalId);
          } else if (typeof progress === "string" && progress.startsWith("Failed:")) {
            setStatus(progress);
            setLoading(false);
            clearInterval(intervalId);
          } else {
            setStatus(progress); // Shows current step string
          }
        } catch (err) {
          console.error("Error checking task status:", err);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => clearInterval(intervalId);
  }, [meetingId, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !deckFile) {
      alert("Please select both a video file and a presentation deck.");
      return;
    }

    setLoading(true);
    setStatus("Uploading files to cloud processing cluster...");
    setPipelineData(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("deck", deckFile);

    try {
      const response = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      setMeetingId(data.meeting_id);
      setStatus("Files ingested. Starting pipeline operations...");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{color: "#111827", margin: "0 0 10px 0"}}>Meeting Intelligence Assistant</h1>
        <p style={{color: "#6b7280", margin: 0}}>Extract time-synchronized insights, action items, and structural timelines.</p>
      </header>

      <div style={styles.mainGrid}>
        {/* Upload Form Panel */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Ingest New Meeting</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Meeting Video (.mp4, .mkv, .avi)</label>
              <input
                type="file"
                accept=".mp4,.mkv,.avi"
                onChange={(e) => setVideoFile(e.target.files[0])}
                style={styles.fileInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Presentation Deck (.pdf)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setDeckFile(e.target.files[0])}
                style={styles.fileInput}
              />
            </div>

            <button type="submit" disabled={loading} style={loading ? styles.btnDisabled : styles.btn}>
              {loading ? "Processing Pipeline..." : "Upload & Analyze Assets"}
            </button>
          </form>
        </section>

        {/* Real-time Processing Logs Panel */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Pipeline Orchestration Logs</h2>
          <div style={styles.logConsole}>
            {status ? (
              <p style={styles.logText}>⏳ <strong style={{ color: "#3b82f6" }}>Status:</strong> {status}</p>
            ) : (
              <p style={styles.placeholderText}>No active ingestion pipelines discovered. Upload assets to initialize.</p>
            )}
            {meetingId && <p style={styles.logSubText}><strong>Active Meeting ID:</strong> {meetingId}</p>}
          </div>
        </section>
      </div>

      {/* Structured Pipeline Outputs Presentation layer */}
      {pipelineData && (
        <>
          {/* Section 1: Physical Workspace Artifacts */}
          <section style={{ ...styles.card, marginTop: "24px" }}>
            <h2 style={{ ...styles.cardTitle, color: "#10b981" }}>✅ Pipeline Workspace Outputs Generated</h2>
            <div style={styles.outputGrid}>
              <div style={styles.outputItem}>
                <strong style={styles.outputLabel}>Extracted Audio Target:</strong>
                <code style={styles.codeBlock}>{pipelineData.audio_path}</code>
              </div>
              <div style={styles.outputItem}>
                <strong style={styles.outputLabel}>Visual Frame Keyframes:</strong>
                <code style={styles.codeBlock}>{pipelineData.frames_directory}</code>
              </div>
              <div style={styles.outputItem}>
                <strong style={styles.outputLabel}>Document Slides Indexed:</strong>
                <p style={{ fontSize: "16px", margin: "8px 0", color: "#334155" }}>Total Pages Processed: <strong>{pipelineData.slide_count}</strong></p>
              </div>
            </div>
          </section>

          {/* Section 2: AI Intelligence Dashboard - NEW */}
          {pipelineData.analytics && (
            <section style={{ ...styles.card, marginTop: "24px" }}>
              <h2 style={{ ...styles.cardTitle, color: "#2563eb" }}>🧠 Meeting Intelligence Dashboard</h2>
              
              <div style={styles.analyticsWrapper}>
                
                {/* Executive Summary Hero Box */}
                <div style={styles.summaryCard}>
                  <h4 style={{margin: '0 0 10px 0', color: '#1e40af'}}>Executive Summary</h4>
                  <p style={styles.summaryText}>{pipelineData.analytics.executive_summary}</p>
                </div>

                {/* Internal Navigation Tabs */}
                <div style={styles.tabBar}>
                  <button 
                    onClick={() => setActiveTab("timeline")} 
                    style={activeTab === "timeline" ? styles.activeTabButton : styles.tabButton}
                  >
                    🕒 Synchronized Timeline ({pipelineData.analytics.timeline?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveTab("actions")} 
                    style={activeTab === "actions" ? styles.activeTabButton : styles.tabButton}
                  >
                    📋 Action Items ({pipelineData.analytics.action_items?.length || 0})
                  </button>
                </div>

                {/* Tab Content Display Area */}
                <div style={styles.tabContentContainer}>
                  
                  {/* Timeline Render */}
                  {activeTab === "timeline" && (
                    <div style={styles.tabContentList}>
                      {pipelineData.analytics.timeline?.map((item, index) => (
                        <div key={index} style={styles.timelineItem}>
                          <div style={styles.timelineMeta}>
                            <span style={styles.timeBadge}>{item.timestamp}</span>
                            <span style={styles.slideBadge}>Slide Reference: {item.slide_reference}</span>
                          </div>
                          <h5 style={styles.itemTitle}>{item.topic}</h5>
                          <p style={styles.itemDetails}>{item.details}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Items Render */}
                  {activeTab === "actions" && (
                    <ul style={styles.actionList}>
                      {pipelineData.analytics.action_items?.map((action, index) => (
                        <li key={index} style={styles.actionItem}>
                          <span style={{color: '#2563eb', fontWeight: 'bold'}}>📌</span> {action}
                        </li>
                      ))}
                    </ul>
                  )}

                </div>

              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Integrated modern styles maintaining user's theme (blue accent, emerald success)
const styles = {
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1f2937", backgroundColor: "#f9fafb", minHeight: "100vh", boxSizing: "border-box" },
  header: { textAlign: "center", marginBottom: "40px" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  card: { backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" },
  cardTitle: { marginTop: 0, marginBottom: "20px", fontSize: "20px", fontWeight: "700", borderBottom: "2px solid #f3f4f6", paddingBottom: "10px", color: "#111827" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontWeight: "600", fontSize: "14px", color: "#4b5563" },
  fileInput: { padding: "10px", border: "1px dashed #d1d5db", borderRadius: "6px", backgroundColor: "#fbfbfb", color: "#6b7280" },
  btn: { backgroundColor: "#2563eb", color: "#ffffff", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s", fontSize: "15px" },
  btnDisabled: { backgroundColor: "#9ca3af", color: "#ffffff", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "not-allowed", fontSize: "15px" },
  logConsole: { backgroundColor: "#1e293b", color: "#f8fafc", padding: "20px", borderRadius: "8px", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "center" },
  logText: { fontSize: "16px", margin: 0, fontFamily: "monospace", lineHeight: "1.5" },
  logSubText: { fontSize: "12px", color: "#94a3b8", marginTop: "12px", fontFamily: "monospace" },
  placeholderText: { color: "#64748b", fontStyle: "italic", textAlign: "center", margin: 0 },
  outputGrid: { display: "flex", flexDirection: "column", gap: "16px" },
  outputItem: { display: "flex", flexDirection: "column", gap: "4px" },
  outputLabel: { fontSize: "14px", color: "#6b7280" },
  codeBlock: { display: "block", backgroundColor: "#f1f5f9", padding: "12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "13px", color: "#0f172a", overflowX: "auto", border: "1px solid #e2e8f0" },

  // NEW Styles for Intelligence Dashboard Layer
  analyticsWrapper: { display: "flex", flexDirection: "column", gap: "20px" },
  summaryCard: { backgroundColor: "#dbeafe", padding: "20px", borderRadius: "8px", borderLeft: "4px solid #3b82f6" },
  summaryText: { fontSize: "15px", color: "#1e3a8a", margin: 0, lineHeight: "1.6" },
  
  tabBar: { display: "flex", gap: "8px", borderBottom: "2px solid #e5e7eb", marginBottom: "10px" },
  tabButton: { padding: "10px 16px", background: "none", border: "none", borderBottom: "3px solid transparent", color: "#6b7280", fontWeight: "600", cursor: "pointer", fontSize: "15px" },
  activeTabButton: { padding: "10px 16px", background: "none", border: "none", borderBottom: "3px solid #2563eb", color: "#2563eb", fontWeight: "700", cursor: "pointer", fontSize: "15px" },
  
  tabContentContainer: { padding: "10px 0" },
  tabContentList: { display: "flex", flexDirection: "column", gap: "16px" },
  
  // Timeline UI specifics
  timelineItem: { backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "10px" },
  timelineMeta: { display: "flex", gap: "10px" },
  timeBadge: { backgroundColor: "#2563eb", color: "#ffffff", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px", fontFamily: "monospace" },
  slideBadge: { backgroundColor: "#10b981", color: "#ffffff", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" },
  itemTitle: { margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" },
  itemDetails: { margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: "1.5" },
  
  // Action Items UI specifics
  actionList: { listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" },
  actionItem: { backgroundColor: "#ffffff", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "15px", color: "#334155", display: "flex", gap: "12px", alignItems: "center"}
};

export default App;