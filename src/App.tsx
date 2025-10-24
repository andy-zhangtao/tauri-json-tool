import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { JsonPanel } from './components/JsonPanel'
import { Toolbar } from './components/Toolbar'
import { LoadingOverlay } from './components/LoadingOverlay'
import { useDebounce } from './hooks/useDebounce'
import { useCopyToClipboard } from './hooks/useCopyToClipboard'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTheme } from './hooks/useTheme'
import { ErrorLocation } from './hooks/useErrorHighlight'
import { usePreferences } from './hooks/usePreferences'
import { jsonService } from './services/jsonService'
import { fileService } from './services/fileService'
import { isFormattingSuccess } from './types/formatting'
import { isError, isSuccess } from './types/validation'
import { extractErrorContext } from './utils/errorParser'
import { calculateJsonMetrics } from './utils/metricsCalculator'
import { migrateFromLocalStorage } from './utils/migration'

// 懒加载非关键组件
const ShortcutsHelp = lazy(() =>
  import('./components/ShortcutsHelp').then((module) => ({
    default: module.ShortcutsHelp,
  }))
)
const LogViewer = lazy(() =>
  import('./components/LogViewer').then((module) => ({ default: module.LogViewer }))
)
const IssueReporter = lazy(() =>
  import('./components/IssueReporter').then((module) => ({
    default: module.IssueReporter,
  }))
)

interface OutputState {
  value: string
  isStale: boolean
  lastValidTime?: Date
}

function App() {
  // 使用偏好管理 Hook
  const {
    theme,
    autoValidate,
    formattingOptions,
    setTheme,
    setAutoValidate,
    setFormattingOptions,
  } = usePreferences()

  // 主题管理 (简化版,不再负责持久化)
  const { toggleTheme } = useTheme(theme, setTheme)

  // 迁移 localStorage 数据到 Tauri Store (仅在首次启动时执行一次)
  useEffect(() => {
    migrateFromLocalStorage()
  }, [])

  const [inputJson, setInputJson] = useState('')
  const [outputState, setOutputState] = useState<OutputState>({
    value: '',
    isStale: false,
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'validating' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorLocation, setErrorLocation] = useState<ErrorLocation | undefined>(undefined)
  const [loadingMessage, setLoadingMessage] = useState<string>()
  const [processingTimeMs, setProcessingTimeMs] = useState<number>()

  // 剪贴板功能
  const {
    copyState: inputCopyState,
    copyToClipboard: copyInput,
  } = useCopyToClipboard()

  const {
    copyState: outputCopyState,
    copyToClipboard: copyOutput,
  } = useCopyToClipboard()

  // 对输入进行防抖处理(500ms)
  const debouncedInputJson = useDebounce(inputJson, 500)

  // 计算输入的完整指标
  const inputMetrics = useMemo(() => {
    return calculateJsonMetrics(inputJson)
  }, [inputJson])

  // 计算输出的完整指标
  const outputMetrics = useMemo(() => {
    return calculateJsonMetrics(outputState.value)
  }, [outputState.value])

  // 注意: inputStats 和 outputStats 已移除,直接使用 inputMetrics 和 outputMetrics

  // 验证函数
  const handleValidate = async () => {
    if (!inputJson.trim()) {
      setErrorMessage('请输入 JSON 内容')
      setValidationStatus('error')
      setErrorLocation(undefined)
      return
    }

    // 大文件提示
    const bytes = new Blob([inputJson]).size
    if (bytes > 1024 * 1024) {
      setLoadingMessage(`正在验证 ${(bytes / (1024 * 1024)).toFixed(2)} MB JSON...`)
    }

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    setProcessingTimeMs(undefined)

    try {
      const result = await jsonService.validateJson(inputJson)

      if (isSuccess(result)) {
        // 验证成功,更新输出
        setValidationStatus('success')
        setProcessingTimeMs(result.processing_time_ms)
        setOutputState({
          value: JSON.stringify(result.data, null, 2),
          isStale: false,
          lastValidTime: new Date(),
        })
        setErrorMessage('')
        setErrorLocation(undefined)
              } else if (isError(result)) {
        // 验证失败
        setValidationStatus('error')

        // 标记输出为过时(如果之前有输出)
        if (outputState.value) {
          setOutputState({
            ...outputState,
            isStale: true,
          })
        }

        // 设置错误信息
        let msg = result.message
        if (result.line && result.column) {
          msg += ` (第 ${result.line} 行, 第 ${result.column} 列)`
        }
        setErrorMessage(msg)

        // 设置错误位置
        if (result.line) {
          setErrorLocation({
            line: result.line,
            column: result.column,
          })

          // 提取错误上下文(暂不使用,为未来增强预留)
          extractErrorContext(
            inputJson,
            result.line,
            result.column
          )
        }
      }
    } catch (error) {
      setValidationStatus('error')
      setErrorMessage(`验证失败: ${error}`)

      // 标记输出为过时
      if (outputState.value) {
        setOutputState({
          ...outputState,
          isStale: true,
        })
      }
    } finally {
      setIsProcessing(false)
      setLoadingMessage(undefined)
    }
  }

  // 自动验证:当启用自动验证且输入变化时触发
  useEffect(() => {
    if (autoValidate && debouncedInputJson.trim()) {
      handleValidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInputJson, autoValidate])

  const handleFormat = async () => {
    if (!inputJson.trim()) {
      setErrorMessage('请输入 JSON 内容')
      setValidationStatus('error')
      setErrorLocation(undefined)
      return
    }

    // 大文件提示
    const bytes = new Blob([inputJson]).size
    if (bytes > 1024 * 1024) {
      setLoadingMessage(`正在格式化 ${(bytes / (1024 * 1024)).toFixed(2)} MB JSON...`)
    }

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    setProcessingTimeMs(undefined)

    try {
      const result = await jsonService.formatJson(inputJson, formattingOptions)

      if (isFormattingSuccess(result)) {
        setValidationStatus('success')
        setProcessingTimeMs(result.processing_time_ms)
        setOutputState({
          value: result.formatted,
          isStale: false,
          lastValidTime: new Date(),
        })
        setErrorMessage('')
        setErrorLocation(undefined)
              } else {
        setValidationStatus('error')
        setErrorMessage(result.message)

        // 标记输出为过时
        if (outputState.value) {
          setOutputState({
            ...outputState,
            isStale: true,
          })
        }
      }
    } catch (error) {
      setValidationStatus('error')
      setErrorMessage(`格式化失败: ${error}`)

      // 标记输出为过时
      if (outputState.value) {
        setOutputState({
          ...outputState,
          isStale: true,
        })
      }
    } finally {
      setIsProcessing(false)
      setLoadingMessage(undefined)
    }
  }

  const handleMinify = async () => {
    if (!inputJson.trim()) {
      setErrorMessage('请输入 JSON 内容')
      setValidationStatus('error')
      setErrorLocation(undefined)
      return
    }

    // 大文件提示
    const bytes = new Blob([inputJson]).size
    if (bytes > 1024 * 1024) {
      setLoadingMessage(`正在压缩 ${(bytes / (1024 * 1024)).toFixed(2)} MB JSON...`)
    }

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    setProcessingTimeMs(undefined)

    try {
      const result = await jsonService.minifyJson(inputJson)

      if (isFormattingSuccess(result)) {
        setValidationStatus('success')
        setProcessingTimeMs(result.processing_time_ms)
        setOutputState({
          value: result.formatted,
          isStale: false,
          lastValidTime: new Date(),
        })
        setErrorMessage('')
        setErrorLocation(undefined)
              } else {
        setValidationStatus('error')
        setErrorMessage(result.message)

        // 标记输出为过时
        if (outputState.value) {
          setOutputState({
            ...outputState,
            isStale: true,
          })
        }
      }
    } catch (error) {
      setValidationStatus('error')
      setErrorMessage(`压缩失败: ${error}`)

      // 标记输出为过时
      if (outputState.value) {
        setOutputState({
          ...outputState,
          isStale: true,
        })
      }
    } finally {
      setIsProcessing(false)
      setLoadingMessage(undefined)
    }
  }

  const handleClear = () => {
    // 如果已经是空的,不需要确认
    const isEmpty = !inputJson.trim() && !outputState.value.trim()
    if (isEmpty) {
      return
    }

    // 检查是否有未保存的格式化输出
    const hasUnsavedOutput = outputState.value && !outputState.isStale

    // 构建确认消息
    let confirmMessage = '确定要清空所有内容吗?'
    if (hasUnsavedOutput) {
      confirmMessage = '当前有格式化的输出尚未导出。确定要清空所有内容吗?'
    }

    // 显示确认对话框
    if (window.confirm(confirmMessage)) {
      setInputJson('')
      setOutputState({ value: '', isStale: false })
      setErrorMessage('')
      setErrorLocation(undefined)
      setValidationStatus('idle')
    }
  }

  // 导入 JSON 文件
  const handleImport = async () => {
    try {
      setIsProcessing(true)
      const result = await fileService.importJsonFile()

      if (result) {
        // 用户选择了文件
        setInputJson(result.content)
        setErrorMessage('')
        setErrorLocation(undefined)
        setValidationStatus('idle')

        // 如果启用了自动验证,会在输入变化后自动触发验证
        // 否则需要用户手动点击验证按钮
      }
      // 如果 result 为 null,表示用户取消了选择
    } catch (error) {
      setErrorMessage(`导入失败: ${error}`)
      setValidationStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  // 导出 JSON 文件
  const handleExport = async () => {
    // 优先导出输出内容,如果没有输出则导出输入内容
    const contentToExport = outputState.value || inputJson

    if (!contentToExport.trim()) {
      setErrorMessage('没有可导出的内容')
      setValidationStatus('error')
      return
    }

    try {
      setIsProcessing(true)
      const savedPath = await fileService.exportJsonFile(contentToExport, {
        defaultFileName: 'formatted.json',
      })

      if (savedPath) {
        // 导出成功,可以显示成功消息
        // 暂时通过重置错误消息来表示成功
        setErrorMessage('')
      }
      // 如果 savedPath 为 null,表示用户取消了保存
    } catch (error) {
      setErrorMessage(`导出失败: ${error}`)
      setValidationStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  // 复制输入内容
  const handleCopyInput = useCallback(async () => {
    await copyInput(inputJson)
  }, [inputJson, copyInput])

  // 复制输出内容
  const handleCopyOutput = useCallback(async () => {
    await copyOutput(outputState.value)
  }, [outputState.value, copyOutput])

  // 快捷键帮助对话框状态
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [showIssueReporter, setShowIssueReporter] = useState(false)

  // 注册键盘快捷键
  useKeyboardShortcuts([
    // 验证
    {
      key: 'v',
      metaKey: true,
      shiftKey: true,
      handler: handleValidate,
      description: '验证 JSON',
    },
    // 格式化
    {
      key: 'f',
      metaKey: true,
      shiftKey: true,
      handler: handleFormat,
      description: '格式化 JSON',
    },
    // 压缩
    {
      key: 'm',
      metaKey: true,
      shiftKey: true,
      handler: handleMinify,
      description: '压缩 JSON',
    },
    // 清除
    {
      key: 'k',
      metaKey: true,
      shiftKey: true,
      handler: handleClear,
      description: '清除输入',
    },
    // 导入
    {
      key: 'i',
      metaKey: true,
      altKey: true,
      handler: handleImport,
      description: '导入文件',
    },
    // 导出
    {
      key: 'e',
      metaKey: true,
      shiftKey: true,
      handler: handleExport,
      description: '导出文件',
    },
    // 复制输入
    {
      key: 'i',
      metaKey: true,
      shiftKey: true,
      handler: handleCopyInput,
      description: '复制输入内容',
    },
    // 复制输出
    {
      key: 'o',
      metaKey: true,
      shiftKey: true,
      handler: handleCopyOutput,
      description: '复制输出内容',
    },
    // 显示快捷键帮助
    {
      key: '/',
      metaKey: true,
      handler: () => setShowShortcutsHelp(true),
      description: '显示快捷键',
    },
  ])

  return (
    <div className="app">
      <header className="app-header">
        <h1>JSON Formatter & Validator</h1>
        <p className="app-subtitle">专业的 JSON 验证与格式化工具</p>
      </header>

      <Toolbar
        onValidate={handleValidate}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onClear={handleClear}
        onImport={handleImport}
        onExport={handleExport}
        onShowShortcutsHelp={() => setShowShortcutsHelp(true)}
        onShowLogViewer={() => setShowLogViewer(true)}
        onShowIssueReporter={() => setShowIssueReporter(true)}
        isProcessing={isProcessing}
        validationStatus={validationStatus}
        formattingOptions={formattingOptions}
        onFormattingOptionsChange={setFormattingOptions}
        autoValidate={autoValidate}
        onAutoValidateChange={setAutoValidate}
        processingTimeMs={processingTimeMs}
        themeMode={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="app-main">
        <div className="panels-container">
          <JsonPanel
            title="输入"
            value={inputJson}
            onChange={setInputJson}
            placeholder="在此输入或粘贴 JSON..."
            error={validationStatus === 'error' ? errorMessage : undefined}
            errorLocation={errorLocation}
            metrics={inputMetrics}
            onCopy={handleCopyInput}
            copyState={inputCopyState}
            showEmptyState={true}
            emptyStateType="input"
          />

          <JsonPanel
            title="输出"
            value={outputState.value}
            readOnly
            placeholder="处理结果将显示在这里..."
            isStale={outputState.isStale}
            staleMessage="此输出基于之前的有效输入"
            metrics={outputMetrics}
            onCopy={handleCopyOutput}
            copyState={outputCopyState}
            showEmptyState={true}
            emptyStateType="output"
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Version 0.1.0 | ztao8607@gmail.com</p>
      </footer>

      {/* 快捷键帮助对话框 - 懒加载 */}
      <Suspense fallback={null}>
        {showShortcutsHelp && (
          <ShortcutsHelp
            isOpen={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
          />
        )}
      </Suspense>

      {/* 日志查看器 - 懒加载 */}
      <Suspense fallback={null}>
        {showLogViewer && (
          <LogViewer
            isOpen={showLogViewer}
            onClose={() => setShowLogViewer(false)}
          />
        )}
      </Suspense>

      {/* 问题报告 - 懒加载 */}
      <Suspense fallback={null}>
        {showIssueReporter && (
          <IssueReporter
            isOpen={showIssueReporter}
            onClose={() => setShowIssueReporter(false)}
          />
        )}
      </Suspense>

      {/* 全局加载遮罩 */}
      <LoadingOverlay isLoading={isProcessing && !!loadingMessage} message={loadingMessage} />
    </div>
  )
}

export default App
