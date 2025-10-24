import { JsonMetrics, emptyMetrics } from '../types/metrics'

/**
 * 计算 JSON 字符串的完整指标
 *
 * @param jsonString JSON 字符串
 * @param options 计算选项
 * @returns 完整的 JSON 指标
 */
export function calculateJsonMetrics(
  jsonString: string,
  options?: {
    skipStructureMetrics?: boolean  // 跳过结构指标计算
    maxDepth?: number                // 最大遍历深度 (防止深度递归)
  }
): JsonMetrics {
  // 空字符串返回空指标
  if (!jsonString) {
    return emptyMetrics
  }

  // 计算基础指标
  const lines = jsonString.split('\n').length
  const chars = jsonString.length
  const bytes = new Blob([jsonString]).size

  // 性能优化: 大文件 (> 1 MB) 默认跳过结构指标计算
  const isLargeFile = bytes > 1024 * 1024
  const shouldSkipStructure = options?.skipStructureMetrics || isLargeFile

  // 如果跳过结构指标,直接返回基础指标
  if (shouldSkipStructure) {
    return {
      lines,
      chars,
      bytes,
      depth: 0,
      objects: 0,
      arrays: 0,
      keys: 0,
    }
  }

  // 初始化结构指标
  let depth = 0
  let objects = 0
  let arrays = 0
  let keys = 0

  // 默认最大深度限制 (防止栈溢出)
  const maxDepth = options?.maxDepth || 100

  // 尝试解析 JSON 并计算结构指标
  try {
    const data = JSON.parse(jsonString)

    // 递归遍历 JSON 结构
    const traverse = (obj: unknown, currentDepth: number): void => {
      // 深度限制保护
      if (currentDepth > maxDepth) {
        return
      }
      // 更新最大深度
      depth = Math.max(depth, currentDepth)

      if (Array.isArray(obj)) {
        // 数组
        arrays++

        // 遍历数组元素
        obj.forEach((item) => {
          if (item !== null && typeof item === 'object') {
            traverse(item, currentDepth + 1)
          }
        })
      } else if (obj !== null && typeof obj === 'object') {
        // 对象
        objects++

        // 获取所有键
        const objKeys = Object.keys(obj)
        keys += objKeys.length

        // 遍历对象值
        objKeys.forEach((key) => {
          const value = (obj as Record<string, unknown>)[key]
          if (value !== null && typeof value === 'object') {
            traverse(value, currentDepth + 1)
          }
        })
      }
    }

    // 开始遍历（深度从 1 开始）
    traverse(data, 1)
  } catch {
    // JSON 解析失败，结构指标保持为 0
    // 这是正常情况（用户正在输入时）
  }

  return {
    lines,
    chars,
    bytes,
    depth,
    objects,
    arrays,
    keys,
  }
}

/**
 * 格式化字节大小为人类可读的字符串
 *
 * @param bytes 字节数
 * @returns 格式化后的字符串（如 "1.23 KB"）
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  // 限制索引范围
  const sizeIndex = Math.min(i, sizes.length - 1)

  // 格式化数字：小于 10 保留 2 位小数，否则保留 1 位小数
  const value = bytes / Math.pow(k, sizeIndex)
  const decimals = value < 10 ? 2 : 1

  return `${value.toFixed(decimals)} ${sizes[sizeIndex]}`
}

/**
 * 计算压缩比（百分比）
 *
 * @param formatted 格式化后的 JSON 字符串
 * @param minified 压缩后的 JSON 字符串
 * @returns 压缩比（0-100）
 */
export function calculateCompressionRatio(
  formatted: string,
  minified: string,
): number {
  if (!formatted || !minified) return 0

  const formattedSize = new Blob([formatted]).size
  const minifiedSize = new Blob([minified]).size

  if (formattedSize === 0) return 0

  // 计算压缩比：(原始大小 - 压缩后大小) / 原始大小 * 100
  return ((formattedSize - minifiedSize) / formattedSize) * 100
}

/**
 * 格式化数字为千分位分隔
 *
 * @param num 数字
 * @returns 格式化后的字符串（如 "1,234,567"）
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}
