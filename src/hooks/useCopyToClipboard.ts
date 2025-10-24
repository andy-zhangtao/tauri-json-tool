import { useState, useCallback } from 'react'
import { clipboardService } from '../services/clipboardService'

export type CopyState = 'idle' | 'copying' | 'success' | 'error'

export interface UseCopyToClipboardResult {
  copyState: CopyState
  copyToClipboard: (text: string) => Promise<void>
  resetCopyState: () => void
}

/**
 * 剪贴板复制 Hook
 * 提供复制状态管理和自动重置功能
 *
 * @returns 复制状态和操作函数
 *
 * @example
 * ```tsx
 * const { copyState, copyToClipboard } = useCopyToClipboard()
 *
 * const handleCopy = async () => {
 *   await copyToClipboard('Hello, World!')
 * }
 *
 * // copyState 会自动在 2 秒后从 'success' 重置为 'idle'
 * ```
 */
export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const copyToClipboard = useCallback(async (text: string) => {
    setCopyState('copying')

    const result = await clipboardService.copyToClipboard(text)

    if (result.success) {
      setCopyState('success')

      // 2 秒后重置状态
      setTimeout(() => {
        setCopyState('idle')
      }, 2000)
    } else {
      setCopyState('error')
      console.error('Copy failed:', result.error)

      // 3 秒后重置状态
      setTimeout(() => {
        setCopyState('idle')
      }, 3000)
    }
  }, [])

  const resetCopyState = useCallback(() => {
    setCopyState('idle')
  }, [])

  return {
    copyState,
    copyToClipboard,
    resetCopyState,
  }
}
