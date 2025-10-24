import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import type { LogEntry, LogStatistics } from '../types/logging'
import { OPERATION_TEXT, RESULT_TEXT } from '../types/logging'

interface LogViewerProps {
  isOpen: boolean
  onClose: () => void
}

export function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const [logsData, statsData] = await Promise.all([
        invoke<LogEntry[]>('get_recent_logs', { limit: 100 }),
        invoke<LogStatistics>('get_log_statistics'),
      ])
      setLogs(logsData)
      setStats(statsData)
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('确定要清除所有日志吗？此操作不可撤销。')) {
      return
    }

    try {
      await invoke('clear_logs')
      await loadLogs() // 重新加载
    } catch (error) {
      console.error('清除日志失败:', error)
      alert('清除日志失败，请重试。')
    }
  }

  const handleOpenLogFolder = async () => {
    try {
      const logPath = await invoke<string>('get_log_file_path')
      const logDir = logPath.substring(0, logPath.lastIndexOf('/'))
      await open(logDir)
    } catch (error) {
      console.error('打开日志文件夹失败:', error)
      alert('无法打开日志文件夹，请手动导航到应用数据目录。')
    }
  }

  const handleExportLogs = () => {
    const text = logs
      .map(
        (log) =>
          `[${log.timestamp}] ${OPERATION_TEXT[log.operation]} - ${RESULT_TEXT[log.result]} (${log.processing_time_ms}ms, ${formatBytes(log.input_size)})${log.error_message ? ` Error: ${log.error_message}` : ''}`
      )
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `json-tool-logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="log-viewer-overlay" onClick={onClose}>
      <div className="log-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="log-viewer-header">
          <h2>操作日志</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        {/* 统计信息 */}
        {stats && stats.total_operations > 0 && (
          <div className="log-stats">
            <div className="stat-card">
              <div className="stat-label">总操作数</div>
              <div className="stat-value">{stats.total_operations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">成功率</div>
              <div className="stat-value success">
                {stats.success_rate.toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均处理时间</div>
              <div className="stat-value">
                {stats.avg_processing_time_ms.toFixed(1)}ms
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">验证 / 格式化 / 压缩</div>
              <div className="stat-value">
                {stats.validate_count} / {stats.format_count} /{' '}
                {stats.minify_count}
              </div>
            </div>
          </div>
        )}

        {/* 日志列表 */}
        <div className="log-list">
          {isLoading ? (
            <div className="log-loading">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="log-empty">
              <p>暂无日志记录</p>
              <p className="hint">执行验证、格式化或压缩操作后，日志将显示在这里。</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`log-entry ${log.result === 'error' ? 'log-error' : 'log-success'}`}
              >
                <div className="log-row-main">
                  <div className="log-timestamp">
                    {new Date(log.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                  <div className="log-operation">
                    {OPERATION_TEXT[log.operation]}
                  </div>
                  <div className={`log-result ${log.result}`}>
                    {RESULT_TEXT[log.result]}
                  </div>
                  <div className="log-time">{log.processing_time_ms}ms</div>
                  <div className="log-size">{formatBytes(log.input_size)}</div>
                </div>
                {log.error_message && (
                  <div className="log-error-msg">{log.error_message}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 操作按钮 */}
        <div className="log-actions">
          <button
            className="btn-secondary"
            onClick={handleOpenLogFolder}
            title="在文件管理器中打开日志文件夹"
          >
            打开日志文件夹
          </button>
          <button
            className="btn-secondary"
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            title="导出日志为文本文件"
          >
            导出日志
          </button>
          <button
            className="btn-danger"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            title="清除所有日志记录"
          >
            清除日志
          </button>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
