import { ErrorContext } from '../types/validation'
import { parseErrorType } from '../utils/errorParser'
import { CodeSnippet } from './CodeSnippet'

export interface ErrorMessageProps {
  message: string
  line?: number
  column?: number
  context?: ErrorContext
  onJumpToError?: () => void
}

/**
 * 详细错误消息组件
 */
export function ErrorMessage({
  message,
  line,
  column,
  context,
  onJumpToError,
}: ErrorMessageProps) {
  const errorType = parseErrorType(message)

  return (
    <div className="error-message-panel">
      {/* 错误头部 */}
      <div className="error-header">
        <span className="error-icon">⚠</span>
        <span className="error-title">JSON 解析错误</span>
      </div>

      {/* 错误详情 */}
      <div className="error-body">
        {/* 错误类型 */}
        <div className="error-detail">
          <strong>错误类型:</strong> {errorType}
        </div>

        {/* 错误信息 */}
        <div className="error-detail">
          <strong>错误信息:</strong> {message}
        </div>

        {/* 错误位置 */}
        {line && (
          <div className="error-location">
            <strong>错误位置:</strong> 第 {line} 行
            {column && `, 第 ${column} 列`}
            {onJumpToError && (
              <button className="jump-button" onClick={onJumpToError}>
                跳转到错误
              </button>
            )}
          </div>
        )}

        {/* 代码片段 */}
        {context && line && (
          <div className="error-context">
            <strong>代码上下文:</strong>
            <CodeSnippet context={context} errorLine={line} />
          </div>
        )}

        {/* 修复建议 */}
        {context?.suggestion && (
          <div className="error-suggestion">
            <strong>💡 建议:</strong> {context.suggestion}
          </div>
        )}
      </div>
    </div>
  )
}
