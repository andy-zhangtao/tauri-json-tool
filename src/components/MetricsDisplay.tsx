import { useState } from 'react'
import { JsonMetrics } from '../types/metrics'
import { formatBytes, formatNumber } from '../utils/metricsCalculator'

interface MetricsDisplayProps {
  metrics: JsonMetrics
  mode?: 'compact' | 'detailed' // 显示模式
}

/**
 * JSON 指标显示组件
 *
 * 提供两种显示模式：
 * - compact: 紧凑模式，只显示行数和大小
 * - detailed: 详细模式，显示所有可用指标
 */
export function MetricsDisplay({
  metrics,
  mode = 'compact',
}: MetricsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 紧凑模式
  if (mode === 'compact' && !isExpanded) {
    return (
      <div className="metrics-compact">
        <span className="metric-item" title={`${formatNumber(metrics.chars)} 字符`}>
          {metrics.lines} 行
        </span>
        <span className="metric-separator">•</span>
        <span className="metric-item" title={`${formatNumber(metrics.bytes)} 字节`}>
          {formatBytes(metrics.bytes)}
        </span>
        {/* 如果有结构信息，显示展开按钮 */}
        {metrics.depth > 0 && (
          <>
            <span className="metric-separator">•</span>
            <button
              className="metrics-expand-btn"
              onClick={() => setIsExpanded(true)}
              title="显示详细指标"
              aria-label="显示详细指标"
            >
              详细
            </button>
          </>
        )}
      </div>
    )
  }

  // 详细模式
  return (
    <div className="metrics-detailed">
      {/* 关闭按钮 */}
      {mode === 'compact' && (
        <button
          className="metrics-close-btn"
          onClick={() => setIsExpanded(false)}
          title="关闭详细指标"
          aria-label="关闭详细指标"
        >
          ✕
        </button>
      )}

      {/* 基础信息 */}
      <div className="metrics-section">
        <h4 className="metrics-section-title">基础信息</h4>
        <div className="metrics-grid">
          <div className="metric-row">
            <span className="metric-label">行数:</span>
            <span className="metric-value">{formatNumber(metrics.lines)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">字符数:</span>
            <span className="metric-value">{formatNumber(metrics.chars)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">大小:</span>
            <span className="metric-value">{formatBytes(metrics.bytes)}</span>
          </div>
        </div>
      </div>

      {/* 结构信息（仅对有效 JSON）*/}
      {metrics.depth > 0 && (
        <div className="metrics-section">
          <h4 className="metrics-section-title">结构信息</h4>
          <div className="metrics-grid">
            <div className="metric-row">
              <span className="metric-label">嵌套深度:</span>
              <span className="metric-value">{metrics.depth}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">对象数:</span>
              <span className="metric-value">{formatNumber(metrics.objects)}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">数组数:</span>
              <span className="metric-value">{formatNumber(metrics.arrays)}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">键总数:</span>
              <span className="metric-value">{formatNumber(metrics.keys)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 性能信息（如果有）*/}
      {metrics.processingTime !== undefined && (
        <div className="metrics-section">
          <h4 className="metrics-section-title">性能信息</h4>
          <div className="metrics-grid">
            <div className="metric-row">
              <span className="metric-label">处理时间:</span>
              <span className="metric-value">{metrics.processingTime}ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
