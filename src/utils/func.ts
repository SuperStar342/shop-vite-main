/**
 * 通用工具类
 */
export default class Func {
  /**
   * 不为空
   * @param val
   * @returns {boolean}
   */
  static notEmpty(val: unknown): boolean {
    return !this.isEmpty(val)
  }

  /**
   * 是否为 null / undefined
   * @param val
   * @returns {boolean}
   */
  static isUndefined(val: unknown): val is null | undefined {
    return val === null || typeof val === 'undefined'
  }

  /**
   * 为空：null / undefined / 空字符串
   * @param val
   * @returns {boolean}
   */
  static isEmpty(val: unknown): boolean {
    if (this.isUndefined(val)) return true
    if (typeof val === 'string' && val === '') return true
    return false
  }

  /**
   * 强转int型
   * @param val
   * @param defaultValue
   * @returns {number}
   */
  static toInt(val: unknown, defaultValue?: number): number {
    if (this.isEmpty(val)) {
      return defaultValue === undefined ? -1 : defaultValue
    }
    const num = parseInt(String(val), 10)
    return Number.isNaN(num) ? (defaultValue === undefined ? -1 : defaultValue) : num
  }

  /**
   * 转为数字型(转换失败则返回原值)
   * @param val
   */
  static toNumber(val: unknown): number | string {
    if (this.isEmpty(val)) return ''
    const num = parseFloat(String(val))
    return Number.isNaN(num) ? String(val) : num
  }

  /**
   * Json强转为Form类型
   * @param obj
   * @returns {FormData}
   */
  static toFormData(obj: Record<string, unknown>): FormData {
    const data = new FormData()
    Object.keys(obj).forEach((key) => {
      const value = obj[key]
      const appendVal = Array.isArray(value) ? value.join(',') : value
      data.append(key, String(appendVal))
    })
    return data
  }

  /**
   * date类转为字符串格式（依赖Date原型format扩展）
   * @param date
   * @param format
   * @returns {string|null}
   */
  static format(date: Date | null | undefined, format = 'YYYY-MM-DD HH:mm:ss'): string | null {
    return date ? (date as any).format(format) : null
  }

  /**
   * 时间戳格式化完整日期时间
   * @param timestamp
   * @returns {string}
   */
  static formatDateTime(timestamp: number | string): string {
    return this.formatDate(new Date(timestamp))
  }

  /**
   * Date 对象转 YYYY-MM-DD HH:mm:ss
   * @param date
   * @returns {string}
   */
  static formatDate(date: Date): string {
    const pad = (num: number) => (num < 10 ? `0${num}` : String(num))

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hour = pad(date.getHours())
    const minute = pad(date.getMinutes())
    const second = pad(date.getSeconds())

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  /**
   * 格式化时区解决时间差问题
   * @param datetime
   * @returns {string}
   */
  static toLocalISOString(datetime: Date): string {
    const timezoneOffset = datetime.getTimezoneOffset() * 60000
    const localDatetime = new Date(datetime.getTime() - timezoneOffset)
    return localDatetime.toISOString()
  }

  /**
   * 根据逗号联合数组
   * @param arr
   * @returns {string | unknown}
   */
  static join(arr: unknown[] | unknown): string | unknown {
    return Array.isArray(arr) ? arr.join(',') : arr
  }

  /**
   * 根据逗号分隔字符串
   * @param str
   * @returns {string[] | ''}
   */
  static split(str: string | undefined | null): string[] | '' {
    return str ? String(str).split(',') : ''
  }

  /**
   * 转换空字符串
   * @param str
   * @returns {string}
   */
  static toStr(str: unknown): string {
    if (this.isUndefined(str)) return ''
    return String(str)
  }

  /**
   * 判断是否为非空数组
   * @param param
   * @returns {boolean}
   */
  static isArrayAndNotEmpty(param: unknown): param is unknown[] {
    return Array.isArray(param) && param.length > 0
  }

  /**
   * 格式化URL自动补http
   * @param url
   * @returns {string | undefined}
   */
  static formatUrl(url: string | undefined): string | undefined {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return `http://${url}`
  }

  /**
   * bytes转换为kb单位
   * @param bytes
   * @returns {string}
   */
  static bytesToKB(bytes: number): string {
    const kb = bytes / 1024
    return kb.toFixed(2)
  }

  // interface EnumItem {
  //   enumKey: string;
  //   enumValue: string;
  // }
  // /**
  //  * json数组转换成key:value;key:value字符串
  //  * @param jsonArray
  //  * @returns {string}
  //  */
  // static jsonArrayToKeyValue(jsonArray: EnumItem[] | undefined | null): string {
  //   if (this.isEmpty(jsonArray)) return '';
  //   return jsonArray.map(item => `${item.enumKey}:${item.enumValue}`).join(';');
  // }
  //
  // /**
  //  * key value字符串转换成json数组
  //  * @param keyValue key:value;key:value
  //  * @returns {EnumItem[]}
  //  */
  // static keyValueToJsonArray(keyValue: string | undefined | null): Array<EnumItem & { id: number }> {
  //   if (this.isEmpty(keyValue)) return [];
  // return String(keyValue).split(';').map((kv, index) => {
  //   const [enumKey = '', enumValue = ''] = kv.split(':');
  //   return {
  //     id: index,
  //     enumKey,
  //     enumValue,
  //   };
  // });
  // }

  /**
   * 检查字符串str中是否包含子字符串val
   * @param str 要检查的字符串
   * @param val 要查找的子字符串
   * @return {boolean}
   */
  static contains(str: unknown, val: string): boolean {
    if (typeof str === 'string' && str.length > 0) {
      return str.includes(val)
    }
    return false
  }

  /**
   * 截取字符串超出补充省略号
   * @param str 字符串
   * @param len 截取长度
   * @returns {string}
   */
  static truncateString(str: string, len = 20): string {
    if (str.length > len) {
      return `${str.slice(0, len)}...`
    }
    return str
  }

  /**
   * 下划线转驼峰（原方法命名camelCaseString逻辑写反，已修正注释）
   * @param str
   * @returns {string}
   */
  static camelCaseString(str: string): string {
    return str.replace(/_([a-z])/g, (_, g1) => g1.toUpperCase())
  }

  /**
   * 生成随机字母数字字符串
   * @param length 长度
   * @returns {string}
   */
  static strGenerate(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const maxLength = 256
    if (length > maxLength) {
      throw new Error(`长度最大值不能超过 ${maxLength}`)
    }

    return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('')
  }

  /**
   * 生成标准 UUID v4
   * @returns {string}
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * 过滤对象空值（'' / null / undefined）
   * @param obj
   * @returns {Record<string, unknown>}
   */
  static filterEmptyObject(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== '' && value !== null && value !== undefined))
  }

  /**
   * 获取用户租户ID，兼容 tenant_id / tenantId 两种字段
   * @param userInfo
   * @returns {string | undefined}
   */
  static getUserTenantId(userInfo?: { tenant_id?: string; tenantId?: string }): string | undefined {
    if (!userInfo) return undefined
    return userInfo.tenant_id ?? userInfo.tenantId
  }
}
