import progress from 'vite-plugin-vitebar'

/** 勿从 /@/config 聚合导入：会把 setting.config 挂进 Vite 配置依赖，改业务配置就整服重启 */
export const createProgress = (env: Record<string, string>) => {
  return progress({ env, projectName: 'Vue Shop Vite - Jpai Home' })
}
