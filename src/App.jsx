import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/check";

const RISK_COLORS = {
  low: { bg: "#1a3a2a", text: "#4ade80", label: "BAJO" },
  medium: { bg: "#3a2a0a", text: "#fbbf24", label: "MEDIO" },
  high: { bg: "#3a1a1a", text: "#f87171", label: "ALTO" },
};

const PRIORITY_COLORS = {
  high: "#f87171",
  medium: "#fbbf24",
  low: "#4ade80",
};

export default function App() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [showAllExposure, setShowAllExposure] = useState(false);

  const handleAnalysis = async () => {
    if (loadingAnalysis || aiUsed) return;
    setLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const res = await fetch(API_URL.replace("/check", "/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setAiUsed(true);
    } catch (e) {
      setAnalysis("No se pudo obtener el análisis.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleCheck = async () => {
    if (!email || loading || analyzed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }

    if (email.length > 254) {
      setError("El email es demasiado largo.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);
    setAiUsed(false);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResult(data);
      setAnalyzed(true);
    } catch (e) {
      setError("No se pudo conectar con la API.");
    } finally {
      setLoading(false);
    }
  };

  const risk = result?.risk;
  const riskStyle = risk ? RISK_COLORS[risk.level] : null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Email<span style={styles.accent}>Checker</span></h1>
          <p style={styles.subtitle}>Analizá el riesgo de seguridad de tu email</p>
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="email"
            placeholder="tucorreo@email.com"
            value={email}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            onChange={(e) => {
              setEmail(e.target.value);
              setAnalyzed(false);
              setShowAllExposure(false);
            }}
          />
          <button style={{ ...styles.button, opacity: analyzed || loading ? 0.5 : 1 }} onClick={handleCheck} disabled={loading || analyzed}>
            {loading ? "Analizando..." : "Analizar"}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <div style={styles.resultBox}>
            <div style={{ ...styles.riskBadge, background: riskStyle.bg }}>
              <span style={{ color: riskStyle.text, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                RIESGO {riskStyle.label}
              </span>
              <span style={{ color: riskStyle.text, fontSize: 36, fontWeight: 800 }}>
                {risk.score}/100
              </span>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <span style={styles.statNum}>{result.breaches.total}</span>
                <span style={styles.statLabel}>Filtraciones</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statNum}>{result.exposure.total_results}</span>
                <span style={styles.statLabel}>Exposición pública</span>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Recomendaciones</h3>
              {result.recommendations.map((r, i) => (
                <div key={i} style={styles.recItem}>
                  <span style={{ ...styles.recDot, background: PRIORITY_COLORS[r.priority] }} />
                  <span style={styles.recText}>{r.message}</span>
                </div>
              ))}
            </div>

            {result.exposure.results.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Exposición pública detectada</h3>
                {(showAllExposure ? result.exposure.results : result.exposure.results.slice(0, 3)).map((r, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <a href={r.link} target="_blank" style={styles.exposureLink}>{r.title}</a>
                    <p style={styles.exposureSnippet}>{r.snippet}</p>
                  </div>
                ))}
                {result.exposure.results.length > 3 && (
                  <button onClick={() => setShowAllExposure(!showAllExposure)} style={styles.showMoreButton}>
                    {showAllExposure ? "Ver menos" : `Ver ${result.exposure.results.length - 3} más`}
                  </button>
                )}
              </div>
            )}

            {result.breaches.sources.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Filtraciones detectadas</h3>
                {result.breaches.sources.some(b => b.date && parseInt(b.date) <= new Date().getFullYear() - 3) && (
                  <p style={styles.infoText}>⚠ Revisá las fechas — si ya cambiaste tu contraseña, el riesgo es menor.</p>
                )}
                <div style={styles.breachList}>
                  {result.breaches.sources.slice(0, 10).map((b, i) => (
                    <span key={i} style={styles.breachTag}>
                      <span>{b.name}</span>
                      {b.date && <span style={{ color: "#64748b", fontSize: 11, display: "block", textAlign: "center" }}>{b.date}</span>}
                    </span>
                  ))}
                  {result.breaches.sources.length > 10 && (
                    <span style={styles.breachTagMore}>+{result.breaches.sources.length - 10} más</span>
                  )}
                </div>
              </div>
            )}

            <div style={styles.section}>
              <button style={{ ...styles.analysisButton, opacity: aiUsed || loadingAnalysis ? 0.5 : 1 }} onClick={handleAnalysis} disabled={aiUsed || loadingAnalysis}>
                {loadingAnalysis ? "Analizando con IA..." : "Ver análisis detallado con IA"}
              </button>
              {analysis && <p style={styles.analysisText}>{analysis}</p>}
            </div>
          </div>
        )}
      </div>

      <footer style={styles.footer}>
        <a href="https://github.com" target="_blank" style={styles.footerLink}>GitHub</a>
        <a href="https://twitter.com" target="_blank" style={styles.footerLink}>Twitter</a>
        <a href="https://linkedin.com" target="_blank" style={styles.footerLink}>LinkedIn</a>
        <a href="mailto:tu@email.com" style={styles.footerLink}>Contacto</a>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#111418",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "60px 16px 40px",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#e2e8f0",
  },
  container: { width: "100%", maxWidth: 560 },
  header: { textAlign: "center", marginBottom: 40 },
  title: { fontSize: 42, fontWeight: 800, margin: 0, letterSpacing: -1 },
  accent: { color: "#60a5fa" },
  subtitle: { color: "#64748b", fontSize: 15, marginTop: 8 },
  inputRow: { display: "flex", gap: 10, marginBottom: 24 },
  input: {
    flex: 1, padding: "12px 16px", borderRadius: 10,
    border: "1px solid #2d3748", background: "#1e2530",
    color: "#e2e8f0", fontSize: 15, outline: "none",
  },
  button: {
    padding: "12px 24px", borderRadius: 10, border: "none",
    background: "#3b82f6", color: "#fff", fontSize: 15,
    fontWeight: 600, cursor: "pointer",
  },
  error: { color: "#f87171", fontSize: 14 },
  resultBox: {
    background: "#1e2530", borderRadius: 16,
    border: "1px solid #2d3748", overflow: "hidden",
  },
  riskBadge: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "28px 0", gap: 4,
  },
  statsRow: {
    display: "flex", borderTop: "1px solid #2d3748",
    borderBottom: "1px solid #2d3748",
  },
  stat: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", padding: "20px 0", gap: 4,
  },
  statNum: { fontSize: 28, fontWeight: 700, color: "#f1f5f9" },
  statLabel: { fontSize: 12, color: "#64748b", letterSpacing: 1 },
  section: { padding: "20px 24px" },
  sectionTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#64748b", marginBottom: 12, margin: "0 0 12px" },
  recItem: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  recDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  recText: { fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 },
  breachList: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" },
  breachTag: {
    padding: "4px 10px", borderRadius: 6, background: "#2d3748",
    fontSize: 12, color: "#94a3b8",
  },
  breachTagMore: {
    padding: "4px 10px", borderRadius: 6, background: "#2d3748",
    fontSize: 12, color: "#60a5fa",
  },
  footer: {
    marginTop: "auto", paddingTop: 40,
    display: "flex", gap: 24,
  },
  footerLink: { color: "#475569", fontSize: 13, textDecoration: "none" },
  infoText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  analysisButton: {
    width: "100%", padding: "12px", borderRadius: 10,
    border: "1px solid #3b82f6", background: "transparent",
    color: "#60a5fa", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  analysisText: {
    marginTop: 14, fontSize: 14, color: "#cbd5e1",
    lineHeight: 1.7, borderLeft: "2px solid #3b82f6",
    paddingLeft: 12,
  },
  exposureLink: {
    fontSize: 13, color: "#60a5fa", textDecoration: "none",
    display: "block", marginBottom: 4,
  },
  exposureSnippet: {
    fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0,
  },
  showMoreButton: {
    background: "none", border: "1px solid #3b82f6", color: "#60a5fa",
    fontSize: 13, cursor: "pointer", padding: "6px 14px",
    borderRadius: 8, marginTop: 4,
  },
};