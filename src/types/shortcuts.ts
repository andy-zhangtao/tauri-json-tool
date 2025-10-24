/**
 * 快捷键类型定义和配置
 */

/**
 * 快捷键动作类型
 */
export type ShortcutAction =
  | 'validate' // 验证 JSON
  | 'format' // 格式化 JSON
  | 'minify' // 压缩 JSON
  | 'clear' // 清除输入
  | 'import' // 导入文件
  | 'export' // 导出文件
  | 'copyInput' // 复制输入
  | 'copyOutput' // 复制输出
  | 'help' // 显示帮助

/**
 * 快捷键定义
 */
export interface ShortcutDefinition {
  action: ShortcutAction
  key: string // 按键字符
  metaKey?: boolean // Cmd (macOS) / Ctrl (Windows/Linux)
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  label: string // 功能描述
  category: 'edit' | 'format' | 'file' | 'help' // 分类
}

/**
 * 判断是否为 macOS
 */
export const isMacOS = (): boolean => {
  return navigator.platform.toLowerCase().includes('mac')
}

/**
 * 获取修饰键的显示文本
 */
export const getModifierText = (
  metaKey?: boolean,
  shiftKey?: boolean,
  altKey?: boolean,
  ctrlKey?: boolean,
): string => {
  const parts: string[] = []
  const isMac = isMacOS()

  if (metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (ctrlKey) {
    parts.push(isMac ? '⌃' : 'Ctrl')
  }
  if (altKey) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift')
  }

  return parts.join(isMac ? '' : '+')
}

/**
 * 获取快捷键的显示文本
 */
export const getShortcutText = (shortcut: ShortcutDefinition): string => {
  const modifier = getModifierText(
    shortcut.metaKey,
    shortcut.shiftKey,
    shortcut.altKey,
    shortcut.ctrlKey,
  )
  const key = shortcut.key.toUpperCase()
  const isMac = isMacOS()

  return isMac ? `${modifier}${key}` : `${modifier}+${key}`
}

/**
 * 所有快捷键配置
 */
export const SHORTCUTS: ShortcutDefinition[] = [
  // 编辑操作
  {
    action: 'validate',
    key: 'v',
    metaKey: true,
    shiftKey: true,
    label: '验证 JSON',
    category: 'edit',
  },
  {
    action: 'clear',
    key: 'k',
    metaKey: true,
    shiftKey: true,
    label: '清除输入',
    category: 'edit',
  },
  {
    action: 'copyInput',
    key: 'i',
    metaKey: true,
    shiftKey: true,
    label: '复制输入',
    category: 'edit',
  },
  {
    action: 'copyOutput',
    key: 'o',
    metaKey: true,
    shiftKey: true,
    label: '复制输出',
    category: 'edit',
  },

  // 格式化操作
  {
    action: 'format',
    key: 'f',
    metaKey: true,
    shiftKey: true,
    label: '格式化 JSON',
    category: 'format',
  },
  {
    action: 'minify',
    key: 'm',
    metaKey: true,
    shiftKey: true,
    label: '压缩 JSON',
    category: 'format',
  },

  // 文件操作
  {
    action: 'import',
    key: 'i',
    metaKey: true,
    altKey: true,
    label: '导入文件',
    category: 'file',
  },
  {
    action: 'export',
    key: 'e',
    metaKey: true,
    shiftKey: true,
    label: '导出文件',
    category: 'file',
  },

  // 帮助
  {
    action: 'help',
    key: '/',
    metaKey: true,
    label: '显示快捷键',
    category: 'help',
  },
]

/**
 * 按分类获取快捷键
 */
export const getShortcutsByCategory = (
  category: ShortcutDefinition['category'],
): ShortcutDefinition[] => {
  return SHORTCUTS.filter((s) => s.category === category)
}

/**
 * 根据动作查找快捷键
 */
export const findShortcut = (
  action: ShortcutAction,
): ShortcutDefinition | undefined => {
  return SHORTCUTS.find((s) => s.action === action)
}

/**
 * 分类名称映射
 */
export const CATEGORY_LABELS: Record<
  ShortcutDefinition['category'],
  string
> = {
  edit: '编辑操作',
  format: '格式化',
  file: '文件操作',
  help: '帮助',
}
