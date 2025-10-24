import { useEffect, useMemo, useState } from 'react'
import { JsonPanel } from './components/JsonPanel'
import { Toolbar } from './components/Toolbar'
import { useDebounce } from './hooks/useDebounce'
import { ErrorLocation } from './hooks/useErrorHighlight'
import { usePreferences } from './hooks/usePreferences'
import { jsonService } from './services/jsonService'
import { isFormattingSuccess } from './types/formatting'
import { isError, isSuccess } from './types/validation'
import { extractErrorContext } from './utils/errorParser'

interface OutputState {
  value: string
  isStale: boolean
  lastValidTime?: Date
}

function App() {
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
    if (
      !inputJson &&
      !outputState.value ||
      window.confirm('确定要清空所有内容吗?')
    ) {
      setInputJson('')
      setOutputState({ value: '', isStale: false })
      setErrorMessage('')
      setErrorLocation(undefined)
      setValidationStatus('idle')
    }
  }

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
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Version 0.1.0 | ztao8607@gmail.com</p>
      </footer>
    </div>
  )
}

export default App
