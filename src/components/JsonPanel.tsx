import { useEffect, useRef } from 'react'
import { useErrorHighlight, ErrorLocation, scrollToError } from '../hooks/useErrorHighlight'

interface JsonPanelProps {
  title: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  error?: string
  errorLocation?: ErrorLocation
  isStale?: boolean
  staleMessage?: string
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
  errorLocation,
  isStale = false,
  staleMessage,
  lineCount,
  charCount,
}: JsonPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 错误高亮位置
  const highlightPosition = useErrorHighlight(
    textareaRef,
    errorLocation || null
  )

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  // 跳转到错误位置
  const handleJumpToError = () => {
    if (errorLocation && textareaRef.current) {
      scrollToError(textareaRef, errorLocation.line, true)
    }
  }

  return (
    <div className={`json-panel ${isStale ? 'stale' : ''}`}>
      <div className="panel-header">
        <h3>
          {title}
          {isStale && <span className="stale-badge">⚠ 过时</span>}
        </h3>
        <div className="panel-meta">
          {lineCount !== undefined && <span>{lineCount} 行</span>}
          {charCount !== undefined && <span>{charCount} 字符</span>}
        </div>
      </div>

      <div className="panel-content">
        {/* 错误高亮层 */}
        {highlightPosition && (
          <div className="error-highlight-layer">
            <div
              className="error-highlight"
              style={{
                top: `${highlightPosition.top}px`,
                height: `${highlightPosition.height}px`,
              }}
            />
          </div>
        )}

        {/* 文本区域 */}
        <textarea
          ref={textareaRef}
          className={`json-textarea ${error ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
        />

        {/* 错误消息 */}
        {error && errorLocation && (
          <div className="error-message">
            <div className="error-message-content">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
            <button className="error-jump-btn" onClick={handleJumpToError}>
              跳转到错误
            </button>
          </div>
        )}

        {/* 过时提示 */}
        {isStale && staleMessage && (
          <div className="stale-notice">
            <span className="stale-icon">ⓘ</span>
            <span>{staleMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
