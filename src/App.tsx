import { useCallback, useEffect, useMemo, useState } from 'react'
import { JsonPanel } from './components/JsonPanel'
import { Toolbar } from './components/Toolbar'
import { ShortcutsHelp } from './components/ShortcutsHelp'
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

interface OutputState {
  value: string
  isStale: boolean
  lastValidTime?: Date
}

function App() {
  // 初始化主题 (必须在顶层调用,确保主题在应用启动时就生效)
  useTheme()

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

  // 使用偏好管理 Hook
  const {
    autoValidate,
    formattingOptions,
    setAutoValidate,
    setFormattingOptions,
  } = usePreferences()

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

  // 计算输入的行数和字符数
  const inputStats = useMemo(() => {
    const lines = inputJson.split('\n').length
    const chars = inputJson.length
    return { lines, chars }
  }, [inputJson])

  // 计算输出的行数和字符数
  const outputStats = useMemo(() => {
    const lines = outputState.value.split('\n').length
    const chars = outputState.value.length
    return { lines, chars }
  }, [outputState.value])

  // 验证函数
  const handleValidate = async () => {
    if (!inputJson.trim()) {
      setErrorMessage('请输入 JSON 内容')
      setValidationStatus('error')
      setErrorLocation(undefined)
            return
    }

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    
    try {
      const result = await jsonService.validateJson(inputJson)

      if (isSuccess(result)) {
        // 验证成功,更新输出
        setValidationStatus('success')
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

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    
    try {
      const result = await jsonService.formatJson(inputJson, formattingOptions)

      if (isFormattingSuccess(result)) {
        setValidationStatus('success')
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
    }
  }

  const handleMinify = async () => {
    if (!inputJson.trim()) {
      setErrorMessage('请输入 JSON 内容')
      setValidationStatus('error')
      setErrorLocation(undefined)
            return
    }

    setIsProcessing(true)
    setValidationStatus('validating')
    setErrorMessage('')
    setErrorLocation(undefined)
    
    try {
      const result = await jsonService.minifyJson(inputJson)

      if (isFormattingSuccess(result)) {
        setValidationStatus('success')
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
        isProcessing={isProcessing}
        validationStatus={validationStatus}
        formattingOptions={formattingOptions}
        onFormattingOptionsChange={setFormattingOptions}
        autoValidate={autoValidate}
        onAutoValidateChange={setAutoValidate}
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
            lineCount={inputStats.lines}
            charCount={inputStats.chars}
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
            lineCount={outputStats.lines}
            charCount={outputStats.chars}
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

      {/* 快捷键帮助对话框 */}
      <ShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  )
}

export default App
