import React, { useState, useEffect } from "react";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [deckFile, setDeckFile] = useState(null);
  const [meetingId, setMeetingId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipelineData, setPipelineData] = useState(null);
  const [activeTab, setActiveTab] = useState("timeline");

  // New Conversational Q&A States
  const [userQuery, setUserQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    let intervalId;
    if (meetingId && loading) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/status/${meetingId}`);
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
            setStatus(progress);
          }
        } catch (err) {
          console.error("Error checking task status:", err);
        }
      }, 2000);
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
    setChatHistory([]);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("deck", deckFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
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

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const queryToSend = userQuery;
    setUserQuery("");
    setQueryLoading(true);

    // Append user message instantly to history
    setChatHistory(prev => [...prev, { role: "user", text: queryToSend }]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/query/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryToSend }),
      });

      if (!response.ok) throw new Error("Failed to compile grounded answer.");

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: "assistant", text: data.answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setQueryLoading(false);
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

      {pipelineData && (
        <>
          {/* Physical Workspace Artifacts */}
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

          {/* AI Intelligence Dashboard Container */}
          {pipelineData.analytics && (
            <div style={styles.dashboardSplitGrid}>
              
              {/* Left Column: Report Analytics */}
              <section style={styles.card}>
                <h2 style={{ ...styles.cardTitle, color: "#2563eb" }}>🧠 Structured Meeting Report</h2>
                <div style={styles.analyticsWrapper}>
                  <div style={styles.summaryCard}>
                    <h4 style={{margin: '0 0 10px 0', color: '#1e3a8a'}}>Executive Summary</h4>
                    <p style={styles.summaryText}>{pipelineData.analytics.executive_summary}</p>
                  </div>

                  <div style={styles.tabBar}>
                    <button onClick={() => setActiveTab("timeline")} style={activeTab === "timeline" ? styles.activeTabButton : styles.tabButton}>🕒 Timeline</button>
                    <button onClick={() => setActiveTab("actions")} style={activeTab === "actions" ? styles.activeTabButton : styles.tabButton}>📋 Actions</button>
                  </div>

                  <div style={styles.tabContentContainer}>
                    {activeTab === "timeline" && (
                      <div style={styles.tabContentList}>
                        {pipelineData.analytics.timeline?.map((item, index) => (
                          <div key={index} style={styles.timelineItem}>
                            <div style={styles.timelineMeta}>
                              <span style={styles.timeBadge}>{item.timestamp}</span>
                              <span style={styles.slideBadge}>Slide: {item.slide_reference}</span>
                            </div>
                            <h5 style={styles.itemTitle}>{item.topic}</h5>
                            <p style={styles.itemDetails}>{item.details}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "actions" && (
                      <ul style={styles.actionList}>
                        {pipelineData.analytics.action_items?.map((action, index) => (
                          <li key={index} style={styles.actionItem}>📌 {action}</li>
                        ))}
                        {(!pipelineData.analytics.action_items || pipelineData.analytics.action_items.length === 0) && (
                          <p style={{color: "#6b7280", fontStyle: "italic"}}>No clear structural action deliverables designated.</p>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              {/* Right Column: Grounded Q&A Conversational Assistant - NEW */}
              <section style={styles.card}>
                <h2 style={{ ...styles.cardTitle, color: "#7c3aed" }}>💬 Cross-Modal Q&A Assistant</h2>
                <div style={styles.chatWrapper}>
                  <div style={styles.chatDisplayWindow}>
                    {chatHistory.length === 0 ? (
                      <p style={styles.chatPlaceholder}>Ask questions like: <em>"What were the core animal lifespans discussed?"</em> or <em>"Does this content match slide 4 text?"</em></p>
                    ) : (
                      chatHistory.map((msg, index) => (
                        <div key={index} style={msg.role === "user" ? styles.userBubbleRow : styles.assistantBubbleRow}>
                          <div style={msg.role === "user" ? styles.userBubble : styles.assistantBubble}>
                            <strong>{msg.role === "user" ? "You: " : "Assistant: "}</strong>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    {queryLoading && (
                      <div style={styles.assistantBubbleRow}>
                        <div style={styles.assistantBubble}><em>Assistant is cross-referencing timeline tokens...</em></div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAskQuestion} style={styles.chatInputForm}>
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Type a custom query..."
                      disabled={queryLoading}
                      style={styles.chatInputField}
                    />
                    <button type="submit" disabled={queryLoading || !userQuery.trim()} style={styles.chatSendBtn}>
                      Send
                    </button>
                  </form>
                </div>
              </section>

            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: "1280px", margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1f2937", backgroundColor: "#f9fafb", minHeight: "100vh", boxSizing: "border-box" },
  header: { textAlign: "center", marginBottom: "40px" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  card: { backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column" },
  cardTitle: { marginTop: 0, marginBottom: "20px", fontSize: "18px", fontWeight: "700", borderBottom: "2px solid #f3f4f6", paddingBottom: "10px", color: "#111827" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontWeight: "600", fontSize: "14px", color: "#4b5563" },
  fileInput: { padding: "10px", border: "1px dashed #d1d5db", borderRadius: "6px", backgroundColor: "#fbfbfb", color: "#6b7280" },
  btn: { backgroundColor: "#2563eb", color: "#ffffff", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "15px" },
  btnDisabled: { backgroundColor: "#9ca3af", color: "#ffffff", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "not-allowed", fontSize: "15px" },
  logConsole: { backgroundColor: "#1e293b", color: "#f8fafc", padding: "20px", borderRadius: "8px", minHeight: "150px", display: "flex", flexDirection: "column", justifyContent: "center" },
  logText: { fontSize: "15px", margin: 0, fontFamily: "monospace" },
  logSubText: { fontSize: "12px", color: "#94a3b8", marginTop: "12px", fontFamily: "monospace" },
  placeholderText: { color: "#64748b", fontStyle: "italic", textAlign: "center", margin: 0 },
  outputGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  outputItem: { display: "flex", flexDirection: "column", gap: "4px" },
  outputLabel: { fontSize: "13px", color: "#6b7280" },
  codeBlock: { display: "block", backgroundColor: "#f1f5f9", padding: "10px", borderRadius: "6px", fontFamily: "monospace", fontSize: "13px", color: "#0f172a", overflowX: "auto", border: "1px solid #e2e8f0" },

  // Split Grid Layout for Report vs Chat Panel
  dashboardSplitGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px", alignItems: "start" },
  analyticsWrapper: { display: "flex", flexDirection: "column", gap: "16px" },
  summaryCard: { backgroundColor: "#eff6ff", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #3b82f6" },
  summaryText: { fontSize: "14px", color: "#1e3a8a", margin: 0, lineHeight: "1.5" },
  tabBar: { display: "flex", gap: "4px", borderBottom: "2px solid #e5e7eb" },
  tabButton: { padding: "8px 12px", background: "none", border: "none", borderBottom: "3px solid transparent", color: "#6b7280", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
  activeTabButton: { padding: "8px 12px", background: "none", border: "none", borderBottom: "3px solid #2563eb", color: "#2563eb", fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  tabContentContainer: { padding: "5px 0" },
  tabContentList: { display: "flex", flexDirection: "column", gap: "12px" },
  timelineItem: { backgroundColor: "#f9fafb", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" },
  timelineMeta: { display: "flex", gap: "8px", marginBottom: "8px" },
  timeBadge: { backgroundColor: "#2563eb", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px", fontFamily: "monospace" },
  slideBadge: { backgroundColor: "#10b981", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "11px" },
  itemTitle: { margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "#111827" },
  itemDetails: { margin: 0, fontSize: "13px", color: "#4b5563", lineHeight: "1.4" },
  actionList: { listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" },
  actionItem: { backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", color: "#334155" },

  // Chat UI Styles
  chatWrapper: { display: "flex", flexDirection: "column", height: "450px", justifyContent: "space-between" },
  chatDisplayWindow: { flexGrow: 1, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", overflowY: "auto", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" },
  chatPlaceholder: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", fontSize: "14px", margin: "auto 0" },
  userBubbleRow: { display: "flex", justifyContent: "flex-end" },
  userBubble: { backgroundColor: "#e0f2fe", color: "#0369a1", padding: "10px 14px", borderRadius: "12px 12px 0 12px", fontSize: "14px", maxWidth: "80%", lineHeight: "1.4" },
  assistantBubbleRow: { display: "flex", justifyContent: "flex-start" },
  assistantBubble: { backgroundColor: "#f3f4f6", color: "#374151", padding: "10px 14px", borderRadius: "12px 12px 12px 0", fontSize: "14px", maxWidth: "80%", border: "1px solid #e5e7eb", lineHeight: "1.4" },
  chatInputForm: { display: "flex", gap: "10px" },
  chatInputField: { flexGrow: 1, padding: "12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", outline: "none" },
  chatSendBtn: { backgroundColor: "#7c3aed", color: "#ffffff", padding: "0 20px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }
};

export default App;