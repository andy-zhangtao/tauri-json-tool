/**
 * localStorage 工具函数
 * 提供类型安全的本地存储操作
 */

/**
 * 从 localStorage 读取数据
 * @param key - 存储键
 * @param defaultValue - 默认值
 * @returns 解析后的值或默认值
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`读取 localStorage 失败 (key: ${key}):`, error)
    return defaultValue
  }
}

/**
 * 向 localStorage 写入数据
 * @param key - 存储键
 * @param value - 要存储的值
 * @returns 是否成功
 */
export function setToStorage<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`写入 localStorage 失败 (key: ${key}):`, error)
    return false
  }
}

/**
 * 从 localStorage 删除数据
 * @param key - 存储键
 * @returns 是否成功
 */
export function removeFromStorage(key: string): boolean {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`删除 localStorage 失败 (key: ${key}):`, error)
    return false
  }
}

/**
 * 清空 localStorage
 * @returns 是否成功
 */
export function clearStorage(): boolean {
  try {
    window.localStorage.clear()
    return true
  } catch (error) {
    console.error('清空 localStorage 失败:', error)
    return false
  }
}

/**
 * 检查 localStorage 是否可用
 * @returns 是否可用
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
