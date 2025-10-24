import { useEffect, useState } from 'react'

export interface ErrorLocation {
  line: number
  column?: number
}

export interface ErrorHighlightPosition {
  top: number
  height: number
}

/**
 * 错误高亮 Hook
 */
export function useErrorHighlight(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  errorLocation: ErrorLocation | null
) {
  const [highlightPosition, setHighlightPosition] = useState<ErrorHighlightPosition | null>(null)

  useEffect(() => {
    if (!textareaRef.current || !errorLocation) {
      setHighlightPosition(null)
      return
    }

    const textarea = textareaRef.current
    const position = calculateErrorLinePosition(textarea, errorLocation.line)

    if (position) {
      setHighlightPosition(position)
    }
  }, [textareaRef, errorLocation])

  return highlightPosition
}

/**
 * 计算错误行的像素位置
 */
function calculateErrorLinePosition(
  textarea: HTMLTextAreaElement,
  lineNumber: number
): ErrorHighlightPosition | null {
  const lines = textarea.value.split('\n')

  // 边界检查
  if (lineNumber < 1 || lineNumber > lines.length) {
    return null
  }

  const style = window.getComputedStyle(textarea)
  const lineHeight = parseFloat(style.lineHeight)
  const paddingTop = parseFloat(style.paddingTop)

  // 计算位置
  const top = paddingTop + (lineNumber - 1) * lineHeight
  const height = lineHeight

  return { top, height }
}

/**
 * 滚动到错误位置
 */
export function scrollToError(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  lineNumber: number,
  smooth: boolean = true
) {
  if (!textareaRef.current) return

  const textarea = textareaRef.current
  const lines = textarea.value.split('\n')

  if (lineNumber < 1 || lineNumber > lines.length) return

  const style = window.getComputedStyle(textarea)
  const lineHeight = parseFloat(style.lineHeight)
  const targetScrollTop = (lineNumber - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight / 2

  textarea.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: smooth ? 'smooth' : 'auto',
  })

  // 聚焦文本框
  textarea.focus()
}
