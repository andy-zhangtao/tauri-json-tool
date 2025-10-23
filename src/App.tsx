import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <header>
        <h1>JSON Formatter & Validator</h1>
        <p className="subtitle">Desktop utility for JSON validation and formatting</p>
      </header>

      <main>
        <div className="status-card">
          <h2>✅ Application Initialized Successfully</h2>
          <p>Task 1: Tauri Project Scaffolding - Complete</p>
        </div>

        <div className="info-section">
          <h3>System Information</h3>
          <ul>
            <li>Framework: React 18 + TypeScript</li>
            <li>Build Tool: Vite 5</li>
            <li>Runtime: Tauri 2</li>
            <li>Window Size: 1200×800 (min: 800×600)</li>
          </ul>
        </div>

        <div className="test-section">
          <h3>Interactive Test</h3>
          <button onClick={() => setCount((count) => count + 1)}>
            Click count: {count}
          </button>
          <p className="hint">This button verifies React state management is working</p>
        </div>

        <div className="next-steps">
          <h3>Next Steps</h3>
          <ol>
            <li>✅ Task 1: Tauri Project Scaffolding</li>
            <li>⏳ Task 2: JSON Parsing & Validation Service</li>
            <li>⏳ Task 3: JSON Formatting & Minification Engine</li>
            <li>⏳ Task 4: Desktop UI Layout</li>
          </ol>
        </div>
      </main>

      <footer>
        <p>Version 0.1.0 | Built with Tauri 2.9</p>
      </footer>
    </div>
  )
}

export default App
