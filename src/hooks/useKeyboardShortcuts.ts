import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  metaKey?: boolean // Cmd on macOS, Ctrl on Windows/Linux (via ctrlKey)
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: () => void
  description?: string
}

/**
 * 键盘快捷键 Hook
 * 提供跨平台的键盘快捷键支持
 *
 * @param shortcuts 快捷键配置数组
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'i',
 *     metaKey: true,  // Cmd/Ctrl 自动适配平台
 *     shiftKey: true,
 *     handler: handleCopyInput,
 *     description: '复制输入'
 *   },
 *   {
 *     key: 'o',
 *     metaKey: true,
 *     shiftKey: true,
 *     handler: handleCopyOutput,
 *     description: '复制输出'
 *   }
 * ])
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略在输入框中的快捷键(除非明确需要)
      const target = event.target as HTMLElement
      const isInInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        // metaKey 在 macOS 上是 Cmd,在 Windows/Linux 上应该用 Ctrl
        // Tauri 会自动处理,但为了兼容性,我们同时检查 metaKey 和 ctrlKey
        const metaMatch =
          shortcut.metaKey === undefined ||
          shortcut.metaKey === (event.metaKey || event.ctrlKey)

        const ctrlMatch =
          shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey

        const shiftMatch =
          shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey

        const altMatch =
          shortcut.altKey === undefined || shortcut.altKey === event.altKey

        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
          // 对于复制类快捷键,允许在 textarea 中使用
          // 但阻止默认的复制行为,使用我们自定义的复制
          if (isInInput && shortcut.metaKey && shortcut.shiftKey) {
            // Cmd/Ctrl + Shift + I/O: 复制全部内容
            event.preventDefault()
            shortcut.handler()
            break
          } else if (!isInInput) {
            // 不在输入框中,直接执行
            event.preventDefault()
            shortcut.handler()
            break
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
