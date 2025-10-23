import { useState } from 'react'
import { jsonService } from './services/jsonService'
import { type ValidationResult, isSuccess, isError } from './types/validation'

function App() {
  const [jsonInput, setJsonInput] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleValidate = async () => {
    if (!jsonInput.trim()) {
      setResult({
        type: 'Error',
        message: '请输入 JSON 内容',
      })
      return
    }

    setIsValidating(true)
    try {
      const validationResult = await jsonService.validateJson(jsonInput)
      setResult(validationResult)
    } catch (error) {
      setResult({
        type: 'Error',
        message: `验证失败: ${error}`,
      })
    } finally {
      setIsValidating(false)
    }
  }

  const loadSampleJson = (type: 'valid' | 'invalid-comma' | 'invalid-quote') => {
    const samples = {
      valid: '{\n  "name": "Alice",\n  "age": 30,\n  "city": "Beijing"\n}',
      'invalid-comma': '{\n  "name": "Bob",\n  "age": 25,\n}',
      'invalid-quote': '{\n  "name: "Charlie"\n}',
    }
    setJsonInput(samples[type])
    setResult(null)
  }

  return (
    <div className="container">
      <header>
        <h1>JSON Formatter & Validator</h1>
        <p className="subtitle">Desktop utility for JSON validation and formatting</p>
      </header>

      <main>
        <div className="status-card">
          <h2>✅ Task 2: JSON Validation Service - Testing</h2>
          <p>14/14 Rust unit tests passed</p>
        </div>

        <div className="test-section">
          <h3>JSON Validation Test</h3>

          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => loadSampleJson('valid')}>
              Load Valid JSON
            </button>
            <button onClick={() => loadSampleJson('invalid-comma')} style={{ marginLeft: '0.5rem' }}>
              Load Invalid (Comma)
            </button>
            <button onClick={() => loadSampleJson('invalid-quote')} style={{ marginLeft: '0.5rem' }}>
              Load Invalid (Quote)
            </button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Enter JSON here..."
            style={{
              width: '100%',
              minHeight: '200px',
              fontFamily: 'monospace',
              padding: '1rem',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginBottom: '1rem',
            }}
          />

          <button onClick={handleValidate} disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate JSON'}
          </button>

          {result && (
            <div style={{ marginTop: '1rem' }}>
              {isSuccess(result) ? (
                <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
                  <strong>✅ Valid JSON</strong>
                  <p>Size: {jsonService.formatSize(result.size)}</p>
                  <pre style={{ marginTop: '0.5rem', overflow: 'auto', maxHeight: '200px' }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ) : isError(result) ? (
                <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
                  <strong>❌ Invalid JSON</strong>
                  <p>{result.message}</p>
                  {result.line && result.column && (
                    <p>Location: Line {result.line}, Column {result.column}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="next-steps">
          <h3>Progress</h3>
          <ol>
            <li>✅ Task 1: Tauri Project Scaffolding</li>
            <li>✅ Task 2: JSON Parsing & Validation Service</li>
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
