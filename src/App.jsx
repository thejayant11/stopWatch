import { useState, useEffect, useRef, useCallback } from "react";



function formatTime(ms, showMs = false) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const millis = Math.floor((ms % 1000) / 10);

  if (h > 0) {
    return {
      main: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      ms: `.${String(millis).padStart(2, "0")}`,
    };
  }
  return {
    main: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    ms: `.${String(millis).padStart(2, "0")}`,
  };
}

function Ring({ progress, color }) {
  const r = 152;
  const circ = 2 * Math.PI * r;
  const offset = circ - progress * circ;
  return (
    <svg className="progress-ring" viewBox="0 0 320 320">
      <circle className="ring-bg" cx="160" cy="160" r={r} />
      <circle
        className="ring-fg"
        cx="160" cy="160" r={r}
        stroke={color}
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const intervalRef = useRef(null);
  const startRef = useRef(null);
  const baseRef = useRef(0);

  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
  }, []);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(tick, 30);
    } else {
      clearInterval(intervalRef.current);
      if (elapsed > 0) baseRef.current = elapsed;
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const toggle = () => setRunning(r => !r);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    baseRef.current = 0;
  };

  const lap = () => {
    if (!running) return;
    const prev = laps.length > 0 ? laps[0].total : 0;
    setLaps(ls => [{ total: elapsed, split: elapsed - prev, id: ls.length + 1 }, ...ls]);
  };

  const times = formatTime(elapsed);
  const fastestIdx = laps.length > 1 ? laps.reduce((a, b) => a.split < b.split ? a : b).id : -1;
  const slowestIdx = laps.length > 1 ? laps.reduce((a, b) => a.split > b.split ? a : b).id : -1;
  const ringProgress = laps.length > 0
    ? ((elapsed - laps[0].total) / 60000) % 1
    : (elapsed / 60000) % 1;

  return (
    <div className="panel">
      <div className="clock-face">
        <Ring progress={ringProgress} color={running ? "#a8f0c6" : "#333"} />
        <div className={`time-display${running ? " running" : ""}`}>{times.main}</div>
        <div className={`ms-display${running ? " running" : ""}`}>{times.ms}</div>
        <div className="mode-label">STOPWATCH</div>
      </div>

      <div className="controls">
        <button className="btn btn-secondary" onClick={reset} title="Reset">RST</button>
        <button className={`btn btn-primary${running ? " running" : ""}`} onClick={toggle}>
          {running ? "PAUSE" : elapsed > 0 ? "RESUME" : "START"}
        </button>
        <button className="btn btn-secondary" onClick={lap} title="Lap" disabled={!running}>LAP</button>
      </div>

      {laps.length > 0 && (
        <div className="laps-section">
          {laps.map(l => {
            const cls = l.id === fastestIdx ? "fastest" : l.id === slowestIdx ? "slowest" : "";
            return (
              <div key={l.id} className={`lap-row ${cls}`}>
                <span className="lap-num">LAP {l.id}</span>
                <span className="lap-split">{formatTime(l.split).main}{formatTime(l.split).ms}</span>
                <span className="lap-total">{formatTime(l.total).main}{formatTime(l.total).ms}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PRESETS = [
  { label: "1 min", s: 60 },
  { label: "5 min", s: 300 },
  { label: "10 min", s: 600 },
  { label: "25 min", s: 1500 },
];

function Timer() {
  const [totalMs, setTotalMs] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [hInput, setHInput] = useState("00");
  const [mInput, setMInput] = useState("05");
  const [sInput, setSInput] = useState("00");
  const intervalRef = useRef(null);
  const startRef = useRef(null);
  const remRef = useRef(0);

  const getInputMs = () => {
    const h = parseInt(hInput) || 0;
    const m = parseInt(mInput) || 0;
    const s = parseInt(sInput) || 0;
    return (h * 3600 + m * 60 + s) * 1000;
  };

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startRef.current;
        const rem = remRef.current - elapsed;
        if (rem <= 0) {
          setRemaining(0);
          setRunning(false);
          setDone(true);
          clearInterval(intervalRef.current);
        } else {
          setRemaining(rem);
        }
      }, 30);
    } else {
      clearInterval(intervalRef.current);
      remRef.current = remaining;
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start = () => {
    const ms = getInputMs();
    if (ms <= 0) return;
    setTotalMs(ms);
    remRef.current = ms;
    setRemaining(ms);
    setDone(false);
    setRunning(true);
  };

  const toggle = () => {
    if (!running && remaining === 0) { start(); return; }
    setRunning(r => !r);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(0);
    setTotalMs(0);
    setDone(false);
    remRef.current = 0;
  };

  const applyPreset = (seconds) => {
    reset();
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    setHInput(String(h).padStart(2, "0"));
    setMInput(String(m).padStart(2, "0"));
    setSInput(String(s).padStart(2, "0"));
  };

  const isActive = running || remaining > 0;
  const progress = totalMs > 0 ? remaining / totalMs : 0;
  const times = formatTime(remaining);

  const displayClass = done ? "danger" : running
    ? progress < 0.1 ? "danger" : progress < 0.25 ? "warning" : "running"
    : "";

  const ringColor = done ? "#f08a8a" : progress < 0.1 ? "#f08a8a" : progress < 0.25 ? "#fbbf8a" : "#a8f0c6";

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  return (
    <div className="panel">
      {!isActive && !done && (
        <div className="timer-input-section">
          <div className="time-unit">
            <label>h</label>
            <input
              className="time-input"
              type="number"
              min="0" max="23"
              value={hInput}
              onChange={e => setHInput(String(clamp(parseInt(e.target.value) || 0, 0, 23)).padStart(2, "0"))}
            />
          </div>
          <span className="colon">:</span>
          <div className="time-unit">
            <label>min</label>
            <input
              className="time-input"
              type="number"
              min="0" max="59"
              value={mInput}
              onChange={e => setMInput(String(clamp(parseInt(e.target.value) || 0, 0, 59)).padStart(2, "0"))}
            />
          </div>
          <span className="colon">:</span>
          <div className="time-unit">
            <label>sec</label>
            <input
              className="time-input"
              type="number"
              min="0" max="59"
              value={sInput}
              onChange={e => setSInput(String(clamp(parseInt(e.target.value) || 0, 0, 59)).padStart(2, "0"))}
            />
          </div>
        </div>
      )}

      {isActive || done ? (
        <div className="clock-face">
          <Ring progress={progress} color={ringColor} />
          <div className={`time-display${displayClass ? " " + displayClass : ""}`}>
            {done ? "DONE" : times.main}
          </div>
          {!done && <div className={`ms-display${running ? " running" : ""}`}>{times.ms}</div>}
          <div className="mode-label">TIMER</div>
        </div>
      ) : (
        <div className="clock-face">
          <Ring progress={0} color="#222" />
          <div className="time-display">
            {String(parseInt(hInput) || 0).padStart(2,"0")}:{String(parseInt(mInput)||0).padStart(2,"0")}:{String(parseInt(sInput)||0).padStart(2,"0")}
          </div>
          <div className="ms-display">.00</div>
          <div className="mode-label">TIMER</div>
        </div>
      )}

      {!isActive && !done && (
        <div className="presets">
          {PRESETS.map(p => (
            <button key={p.s} className="preset-btn" onClick={() => applyPreset(p.s)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="controls">
        <button className="btn btn-secondary" onClick={reset}>RST</button>
        <button className={`btn btn-primary${running ? " running" : ""}`} onClick={toggle}>
          {done ? "AGAIN" : running ? "PAUSE" : remaining > 0 ? "RESUME" : "START"}
        </button>
        <div style={{ width: 52 }} />
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("stopwatch");

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="tab-row">
          <button
            className={`tab-btn${tab === "stopwatch" ? " active" : ""}`}
            onClick={() => setTab("stopwatch")}
          >Stopwatch</button>
          <button
            className={`tab-btn${tab === "timer" ? " active" : ""}`}
            onClick={() => setTab("timer")}
          >Timer</button>
        </div>
        {tab === "stopwatch" ? <Stopwatch /> : <Timer />}
      </div>
    </>
  );
}
