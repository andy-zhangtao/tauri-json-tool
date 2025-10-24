/**
 * 空状态组件
 * 当没有内容时显示引导信息
 */

interface EmptyStateProps {
  /**
   * 类型: input 或 output
   */
  type: 'input' | 'output'
}

export function EmptyState({ type }: EmptyStateProps) {
  if (type === 'input') {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <h3 className="empty-state-title">开始使用 JSON 工具</h3>
        <div className="empty-state-content">
          <p>您可以通过以下方式添加 JSON 内容:</p>
          <ul className="empty-state-list">
            <li>
              <strong>粘贴</strong> - 直接粘贴 JSON 到输入框
            </li>
            <li>
              <strong>导入</strong> - 点击"导入"按钮从文件加载
            </li>
            <li>
              <strong>输入</strong> - 手动输入或编辑 JSON
            </li>
          </ul>
          <p className="empty-state-hint">
            💡 支持快捷键 <kbd>Cmd/Ctrl+V</kbd> 粘贴内容
          </p>
        </div>
      </div>
    )
  }

  // Output 空状态
  return (
    <div className="empty-state">
      <div className="empty-state-icon">⚙️</div>
      <h3 className="empty-state-title">等待处理</h3>
      <div className="empty-state-content">
        <p>在输入框添加 JSON 后:</p>
        <ul className="empty-state-list">
          <li>
            <strong>验证</strong> - 检查 JSON 格式是否正确
          </li>
          <li>
            <strong>格式化</strong> - 美化 JSON 结构
          </li>
          <li>
            <strong>压缩</strong> - 去除多余空格
          </li>
        </ul>
        <p className="empty-state-hint">
          💡 启用"自动验证"可在输入时自动处理
        </p>
      </div>
    </div>
  )
}
