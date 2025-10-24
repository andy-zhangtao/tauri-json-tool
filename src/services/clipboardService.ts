export interface CopyResult {
  success: boolean
  error?: string
}

/**
 * 剪贴板服务
 * 提供跨平台的剪贴板操作功能
 * 使用浏览器原生 Clipboard API
 */
class ClipboardService {
  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   * @returns 复制结果
   */
  async copyToClipboard(text: string): Promise<CopyResult> {
    if (!text) {
      return {
        success: false,
        error: '内容为空,无法复制',
      }
    }

    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return { success: true }
      }

      // 回退到传统方法
      return this.legacyCopy(text)
    } catch (error) {
      console.error('Clipboard API failed:', error)

      // 尝试传统方法作为最后的回退
      return this.legacyCopy(text)
    }
  }

  /**
   * 传统方案: 使用 document.execCommand (已废弃但兼容性好)
   * @param text 要复制的文本
   * @returns 复制结果
   */
  private legacyCopy(text: string): CopyResult {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      const success = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (success) {
        return { success: true }
      } else {
        return {
          success: false,
          error: '复制失败',
        }
      }
    } catch (error) {
      console.error('Legacy copy failed:', error)
      return {
        success: false,
        error: '复制失败',
      }
    }
  }
}

export const clipboardService = new ClipboardService()
