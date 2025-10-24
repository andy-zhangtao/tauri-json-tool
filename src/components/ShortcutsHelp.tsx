import {
  SHORTCUTS,
  CATEGORY_LABELS,
  getShortcutText,
  ShortcutDefinition,
} from '../types/shortcuts'

interface ShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 快捷键帮助对话框组件
 */
export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null

  // 按分类分组快捷键
  const groupedShortcuts: Record<
    ShortcutDefinition['category'],
    ShortcutDefinition[]
  > = {
    edit: SHORTCUTS.filter((s) => s.category === 'edit'),
    format: SHORTCUTS.filter((s) => s.category === 'format'),
    file: SHORTCUTS.filter((s) => s.category === 'file'),
    help: SHORTCUTS.filter((s) => s.category === 'help'),
  }

  return (
    <div className="shortcuts-help-overlay" onClick={onClose}>
      <div
        className="shortcuts-help-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-help-header">
          <h2>键盘快捷键</h2>
          <button
            className="shortcuts-help-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="shortcuts-help-content">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => {
            if (shortcuts.length === 0) return null

            return (
              <div
                key={category}
                className="shortcuts-help-category"
              >
                <h3>
                  {
                    CATEGORY_LABELS[
                      category as ShortcutDefinition['category']
                    ]
                  }
                </h3>
                <div className="shortcuts-help-list">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="shortcuts-help-item"
                    >
                      <span className="shortcut-label">{shortcut.label}</span>
                      <kbd className="shortcut-keys">
                        {getShortcutText(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="shortcuts-help-footer">
          <p>
            提示: 按 <kbd>⌘ /</kbd> 或 <kbd>Ctrl /</kbd>{' '}
            可随时打开此帮助面板
          </p>
        </div>
      </div>
    </div>
  )
}
