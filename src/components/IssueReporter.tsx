import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import type { LogEntry } from '../types/logging'

const GITHUB_REPO = 'your-username/tauri-json-tool'
const ISSUE_URL = `https://github.com/${GITHUB_REPO}/issues/new`

interface IssueReporterProps {
  isOpen: boolean
  onClose: () => void
}

export function IssueReporter({ isOpen, onClose }: IssueReporterProps) {
  const [includeLog, setIncludeLog] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReportIssue = async () => {
    setIsSubmitting(true)
    try {
      // 收集诊断信息
      const platform = navigator.platform
      const userAgent = navigator.userAgent
      const appVersion = '0.1.0' // TODO: 从某处获取

      // 可选：获取最近的错误日志
      let recentErrors = ''
      if (includeLog) {
        try {
          const logs = await invoke<LogEntry[]>('get_recent_logs', { limit: 10 })
          const errors = logs.filter((log) => log.result === 'error')
          if (errors.length > 0) {
            recentErrors = errors
              .map(
                (log) =>
                  `- ${new Date(log.timestamp).toLocaleString('zh-CN')}: ${log.error_message || '未知错误'}`
              )
              .join('\n')
          }
        } catch (e) {
          console.error('获取日志失败:', e)
        }
      }

      // 构建 Issue 模板
      const issueBody = `
## 问题描述

请简要描述您遇到的问题...

## 复现步骤

1.
2.
3.

## 预期行为

描述您期望发生的行为...

## 实际行为

描述实际发生的行为...

## 环境信息

- **应用版本**: ${appVersion}
- **操作系统**: ${platform}
- **用户代理**: ${userAgent}

${recentErrors ? `## 最近的错误日志\n\n\`\`\`\n${recentErrors}\n\`\`\`\n` : ''}

## 附加信息

请提供任何其他有助于解决问题的信息...
`.trim()

      // 打开 GitHub Issues 页面
      const url = `${ISSUE_URL}?body=${encodeURIComponent(issueBody)}`
      await open(url)

      // 关闭对话框
      onClose()
    } catch (error) {
      console.error('打开问题报告页面失败:', error)
      alert(
        '无法打开问题报告页面，请手动访问 GitHub Issues:\n' + ISSUE_URL
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="issue-reporter-overlay" onClick={onClose}>
      <div className="issue-reporter-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="issue-reporter-header">
          <h2>报告问题</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="issue-reporter-content">
          <p>
            如果您遇到问题或有功能建议，请通过 GitHub Issues 告诉我们。
          </p>

          <p className="privacy-note">
            我们重视您的隐私。问题报告不会包含您的 JSON 数据内容，仅包含操作日志的元数据（操作类型、结果、错误消息）。
          </p>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeLog}
              onChange={(e) => setIncludeLog(e.target.checked)}
            />
            <span>包含最近的错误日志（不含您的 JSON 数据）</span>
          </label>

          <div className="issue-reporter-actions">
            <button
              className="btn-primary"
              onClick={handleReportIssue}
              disabled={isSubmitting}
            >
              {isSubmitting ? '正在打开...' : '在 GitHub 上报告问题'}
            </button>
            <button className="btn-secondary" onClick={onClose}>
              取消
            </button>
          </div>

          <div className="issue-reporter-footer">
            <p className="hint">
              点击后将在浏览器中打开 GitHub Issues 页面，并自动填充问题模板。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
