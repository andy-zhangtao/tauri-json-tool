/**
 * LoadingOverlay 组件
 * 显示全局加载遮罩和加载消息
 */

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
}

export function LoadingOverlay({ isLoading, message }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  )
}
