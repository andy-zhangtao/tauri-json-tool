import { useEffect, useRef } from 'react'
import { useErrorHighlight, ErrorLocation, scrollToError } from '../hooks/useErrorHighlight'
import { CopyState } from '../hooks/useCopyToClipboard'
import { EmptyState } from './EmptyState'

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
  onCopy?: () => void
  copyState?: CopyState
  showEmptyState?: boolean
  emptyStateType?: 'input' | 'output'
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
  onCopy,
  copyState = 'idle',
  showEmptyState = false,
  emptyStateType = 'input',
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

  // 复制按钮内容
  const getCopyButtonContent = () => {
    switch (copyState) {
      case 'copying':
        return '⏳ 复制中...'
      case 'success':
        return '✓ 已复制'
      case 'error':
        return '✗ 失败'
      default:
        return '📋 复制'
    }
  }

  return (
    <div className={`json-panel ${isStale ? 'stale' : ''}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <h3>
            {title}
            {isStale && <span className="stale-badge">⚠ 过时</span>}
          </h3>
        </div>
        <div className="panel-header-right">
          <div className="panel-meta">
            {lineCount !== undefined && <span>{lineCount} 行</span>}
            {charCount !== undefined && <span>{charCount} 字符</span>}
          </div>
          {onCopy && (
            <button
              className={`copy-button copy-button-${copyState}`}
              onClick={onCopy}
              disabled={copyState === 'copying' || !value}
              title={`复制到剪贴板 (${readOnly ? 'Cmd/Ctrl+Shift+O' : 'Cmd/Ctrl+Shift+I'})`}
            >
              {getCopyButtonContent()}
            </button>
          )}
        </div>
      </div>

      <div className="panel-content">
        {/* 空状态 */}
        {showEmptyState && !value && !error && (
          <EmptyState type={emptyStateType} />
        )}

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
          className={`json-textarea ${error ? 'has-error' : ''} ${showEmptyState && !value ? 'empty' : ''}`}
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
