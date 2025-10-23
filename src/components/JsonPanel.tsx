import { useEffect, useRef } from 'react'

interface JsonPanelProps {
  title: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  error?: string
  lineCount?: number
  charCount?: number
}

export function JsonPanel({
  title,
  value,
  onChange,
  readOnly = false,
  placeholder = '',
  error,
  lineCount,
  charCount,
}: JsonPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  return (
    <div className="json-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <div className="panel-meta">
          {lineCount !== undefined && <span>{lineCount} 行</span>}
          {charCount !== undefined && <span>{charCount} 字符</span>}
        </div>
      </div>

      <div className="panel-content">
        <textarea
          ref={textareaRef}
          className={`json-textarea ${error ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
        />
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
