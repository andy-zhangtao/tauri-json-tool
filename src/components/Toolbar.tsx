import { type FormattingOptions } from '../types/formatting'
import { type ThemeMode } from '../types/theme'
import { ThemeToggle } from './ThemeToggle'

interface ToolbarProps {
  onValidate: () => void
  onFormat: () => void
  onMinify: () => void
  onClear: () => void
  onImport: () => void
  onExport: () => void
  onShowShortcutsHelp?: () => void
  onShowLogViewer?: () => void
  onShowIssueReporter?: () => void
  isProcessing: boolean
  validationStatus: 'idle' | 'validating' | 'success' | 'error'
  formattingOptions: FormattingOptions
  onFormattingOptionsChange: (options: FormattingOptions) => void
  autoValidate: boolean
  onAutoValidateChange: (enabled: boolean) => void
  processingTimeMs?: number
  themeMode: ThemeMode
  onThemeToggle: () => void
}

export function Toolbar({
  onValidate,
  onFormat,
  onMinify,
  onClear,
  onImport,
  onExport,
  onShowShortcutsHelp,
  onShowLogViewer,
  onShowIssueReporter,
  isProcessing,
  validationStatus,
  formattingOptions,
  onFormattingOptionsChange,
  autoValidate,
  onAutoValidateChange,
  processingTimeMs,
  themeMode,
  onThemeToggle,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          onClick={onImport}
          disabled={isProcessing}
          className="btn-secondary"
          title="从文件导入 JSON (⌘⌥I)"
        >
          导入
        </button>
        <button
          onClick={onExport}
          disabled={isProcessing}
          className="btn-secondary"
          title="导出 JSON 到文件 (⌘⇧E)"
        >
          导出
        </button>
      </div>

      <div className="toolbar-section">
        <button
          onClick={onValidate}
          disabled={isProcessing}
          className="btn-primary"
          title="验证 JSON 格式 (⌘⇧V)"
        >
          {isProcessing ? '处理中...' : '验证'}
        </button>
        <button
          onClick={onFormat}
          disabled={isProcessing}
          className="btn-primary"
          title="美化 JSON (⌘⇧F)"
        >
          格式化
        </button>
        <button
          onClick={onMinify}
          disabled={isProcessing}
          className="btn-primary"
          title="压缩 JSON (⌘⇧M)"
        >
          压缩
        </button>
        <button
          onClick={onClear}
          disabled={isProcessing}
          className="btn-secondary"
          title="清空输入和输出 (⌘⇧K)"
        >
          清空
        </button>
      </div>

      <div className="toolbar-section">
        <div className="option-group">
          <label>缩进:</label>
          <select
            value={formattingOptions.indent}
            onChange={(e) =>
              onFormattingOptionsChange({
                ...formattingOptions,
                indent: parseInt(e.target.value) as 2 | 4,
              })
            }
            disabled={isProcessing}
          >
            <option value={2}>2 空格</option>
            <option value={4}>4 空格</option>
          </select>
        </div>

        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={formattingOptions.trailing_newline}
              onChange={(e) =>
                onFormattingOptionsChange({
                  ...formattingOptions,
                  trailing_newline: e.target.checked,
                })
              }
              disabled={isProcessing}
            />
            尾部换行
          </label>
        </div>

        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={autoValidate}
              onChange={(e) => onAutoValidateChange(e.target.checked)}
              disabled={isProcessing}
              title="启用后,输入变化时自动验证 JSON"
            />
            自动验证
          </label>
        </div>
      </div>

      <div className="toolbar-section">
        <div className={`status-indicator status-${validationStatus}`}>
          {validationStatus === 'idle' && '⚪ 未验证'}
          {validationStatus === 'validating' && '⏳ 验证中...'}
          {validationStatus === 'success' && (
            <>
              ✓ JSON 有效
              {processingTimeMs !== undefined && (
                <span className="processing-time">({processingTimeMs}ms)</span>
              )}
            </>
          )}
          {validationStatus === 'error' && '✗ JSON 无效'}
        </div>
        <ThemeToggle themeMode={themeMode} onToggle={onThemeToggle} />
        {onShowLogViewer && (
          <button
            className="btn-icon"
            onClick={onShowLogViewer}
            title="查看操作日志"
            aria-label="查看操作日志"
          >
            📋
          </button>
        )}
        {onShowIssueReporter && (
          <button
            className="btn-icon"
            onClick={onShowIssueReporter}
            title="报告问题"
            aria-label="报告问题"
          >
            🐛
          </button>
        )}
        {onShowShortcutsHelp && (
          <button
            className="btn-icon"
            onClick={onShowShortcutsHelp}
            title="显示键盘快捷键 (⌘/)"
            aria-label="显示键盘快捷键"
          >
            ?
          </button>
        )}
      </div>
    </div>
  )
}
