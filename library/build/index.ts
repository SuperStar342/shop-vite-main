import { fileViewerRenderers } from '@file-viewer/vite-plugin'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import chokidar from 'chokidar'
import dayjs from 'dayjs'
import pc from 'picocolors'
import type { Plugin } from 'vite'
import { createBanner } from './banner/'
import { createCompress } from './compress/'
import { createHttps } from './https'
import { createMock } from './mock/'
import { createProgress } from './progress/'
import { createPwa } from './pwa/'
import { createSvgIcons } from './svgSprite/'
import { createUnPlugin } from './unplugin/'
import { createVisualizer } from './visualizer/'
import { cliConfig } from '/@/config/cli.config'

const {
  compress,
  https,
  localEnabled,
  port,
  prodEnabled,
  pwa,
  pwaDev,
  report,
} = cliConfig as {
  compress: boolean | 'gzip' | 'brotli' | string
  https: boolean
  localEnabled: boolean
  port: number
  prodEnabled: boolean
  pwa: boolean
  pwaDev: boolean
  report: boolean
}

const viteApp = 'VITE_' + 'APP_'
const viteUser = 'VITE_' + 'USER_'

export const createVitePlugin = (env: Record<string, string>) => {
  const vitePlugins: (Plugin | Plugin[])[] = [vue()]
  const userName = env[`${viteApp}GITHUB_USER_NAME`]
  const secretKey = env[`${viteApp}SECRET_KEY`]
  const nodeEnv = env[`${viteUser}NODE_ENV`]
  const isEmpty = (value: any) => {
    return value == undefined || value == '' || value == null
  }
  if (isEmpty(userName) || isEmpty(secretKey)) return
  if (nodeEnv !== 'development' && (isEmpty(userName) || isEmpty(secretKey))) return
  vitePlugins.push(
    vueJsx(),
    createProgress(env),
    createUnPlugin(env),
    createMock(localEnabled, prodEnabled),
    createSvgIcons(),
    createBanner(),
    // File Viewer：构建时发布 Worker/WASM 等到 /file-viewer/
    // Windows 下每次 dev 全量拷贝并覆盖 flyfish-viewer-assets.json 易触发 UNKNOWN 锁文件错误，
    // 资源已落在 public/file-viewer，开发态跳过复制，仅在 build 时同步。
    fileViewerRenderers({
      copyAssets: process.platform === 'win32' ? { mode: 'build' } : true,
    })
    // ,createUnoCSSPlugin() // 如需开启UnoCSS，请取消注释
  )
  if (compress) vitePlugins.push(createCompress(compress))
  if (pwa) vitePlugins.push(createPwa(nodeEnv, pwaDev))
  if (https) vitePlugins.push(createHttps())
  if (report) vitePlugins.push(createVisualizer())
  const base64VersionPlugin = () => ({
    name: 'base64-version-plugin',
    transformIndexHtml(html: string) {
      const githubUserName = env.VITE_APP_GITHUB_USER_NAME || process.env.VITE_APP_GITHUB_USER_NAME || 'test'
      const base64UserName = Buffer.from(githubUserName).toString('base64')
      let result = html.replace(/\/static\/css\/loading\.css\?v=[^"&\s]*/g, '/static/css/loading.css')
      result = result.replace(/(\/static\/css\/loading\.css)(["\s>])/g, `$1?v=${base64UserName}$2`)
      return result
    },
  })

  vitePlugins.push(base64VersionPlugin() as any)
  return vitePlugins
}

export const createWatch = (env: Record<string, string>) => {
  //为了防止新同事忘记配置授权码而造成项目无法打包，请保留以下提示
  const userName = env[`${viteApp}GITHUB_USER_NAME`]
  const secretKey = env[`${viteApp}SECRET_KEY`]
  const nodeEnv = env[`${viteUser}NODE_ENV`]

  if (nodeEnv === 'production' && (userName === 'test' || secretKey === 'preview')) {
    console.log(
      `${pc.red(
        '检测到您的用户名或key未配置，key在购买时通过邮件邀请函发放，如您已购买请仔细阅读文档并进行配置，配置完成后方可打包使用。购买地址：https://vuejs-core.cn/authorization/shop-vite.html'
      )}`
    )
    process.exit()
  }

  if (nodeEnv === 'development') {
    chokidar.watch('./src/views').on('change', (path) => {
      if (path.endsWith('vue')) {
        console.log(
          `\n${pc.gray(dayjs().format('HH:mm:ss'))} ${pc.cyan('[Vue Sh' + 'op Vite]')} ${pc.cyan(`http://localhost:${port}/`)} ${pc.green(
            'update success'
          )} `
        )
      }
    })
  }
}
