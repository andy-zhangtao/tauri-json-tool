import { ErrorContext } from '../types/validation'

interface CodeSnippetProps {
  context: ErrorContext
  errorLine: number
}

/**
 * 代码片段显示组件
 * 用于显示错误上下文,包括错误行及其前后几行
 */
export function CodeSnippet({ context, errorLine }: CodeSnippetProps) {
  const { beforeLines, errorLine: errorLineContent, afterLines } = context

  // 计算起始行号
  const startLineNumber = errorLine - beforeLines.length

  return (
    <div className="code-snippet">
      {/* 错误前的行 */}
      {beforeLines.map((line, index) => (
        <div key={`before-${index}`} className="code-line">
          <span className="line-number">{startLineNumber + index}</span>
          <span className="line-content">{line || ' '}</span>
        </div>
      ))}

      {/* 错误行 */}
      <div className="code-line error-line">
        <span className="line-number">{errorLine}</span>
        <span className="line-content">{errorLineContent || ' '}</span>
        <span className="error-marker">← 错误在这里</span>
      </div>

      {/* 错误后的行 */}
      {afterLines.map((line, index) => (
        <div key={`after-${index}`} className="code-line">
          <span className="line-number">{errorLine + index + 1}</span>
          <span className="line-content">{line || ' '}</span>
        </div>
      ))}
    </div>
  )
}
