import autoprefixer from 'autoprefixer'
import dayjs from 'dayjs'
import { resolve } from 'node:path'
import type { ConfigEnv, UserConfig } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import {
  assetsDir,
  base,
  chunkSizeWarningLimit,
  cssCodeSplit,
  exclude,
  https,
  include,
  minify,
  open,
  outDir,
  outputHash,
  port,
  reportCompressedSize,
} from '/@/config'
import { createVitePlugin, createWatch } from '/@vab/build'

const lastBuildTime = dayjs().format('YYYY-MM-DD HH:mm:ss')

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  process.env['VITE_APP_UPDATE_TIME'] = lastBuildTime
  process.env['VITE_USER_NODE_ENV'] = mode
  const root = process.cwd()
  const env = loadEnv(mode, root)
  createWatch(env)

  if (mode === 'development') {
    console.log(`鏋勫缓鏃堕棿: ${lastBuildTime}`)
  }

  return {
    base,
    root,
    server: {
      open,
      port,
      hmr: {
        overlay: true,
      },
      host: '0.0.0.0',
      warmup: {
        clientFiles: ['./index.html', './library/{components,layouts}/*', './src/{views,plugins}/*'],
      },
      https,
      fs: {},
      proxy: {
        // MinIO 对象预览（头像等）：浏览器走同源 /oss-minio → 9000
        '/oss-minio': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/oss-minio/, ''),
        },
        '/api/blade-system': {
          target: 'http://127.0.0.1:8106',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-system/, ''),
        },
        '/api/blade-desk': {
          target: 'http://127.0.0.1:8105',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-desk/, ''),
        },
        '/api/blade-log': {
          target: 'http://127.0.0.1:8103',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-log/, ''),
        },
        '/api/blade-resource': {
          target: 'http://127.0.0.1:8010',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-resource/, ''),
        },
        '/api/blade-auth': {
          target: 'http://127.0.0.1:8100',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-auth/, ''),
        },
        '/api/blade-shop': {
          target: 'http://127.0.0.1:8106',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/blade-shop/, '/shop'),
        },
        '/api': {
          target: 'http://127.0.0.1:80',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '~/': `${resolve(__dirname, '.')}/`,
        '/@/': `/${resolve(__dirname, 'src')}/`,
        '/@vab/': `/${resolve(__dirname, 'library')}/`,
      },
    },
    optimizeDeps: {
      include,
      exclude,
    },
    build: {
      assetsDir,
      chunkSizeWarningLimit,
      cssCodeSplit,
      outDir,
      reportCompressedSize,
      rollupOptions: {
        //treeshake: false,
        onwarn: () => {
          return
        },
        output: {
          chunkFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          entryFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          assetFileNames: outputHash ? 'static/[ext]/[name]-[hash].[ext]' : 'static/[ext]/[name].[ext]',
          manualChunks: {
            'vsv-element-plus': ['element-plus'],
            'vsv-nprogress': ['nprogress'],
            'vsv-icon': ['vsv-icon'],
            'vsv-echarts': ['echarts'],
          },
        },
      },
      minify,
      sourcemap: false,
      target: 'es2015',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({ grid: true }) as any,
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule: { name: string; remove: () => void }) => {
                if (atRule.name === 'charset') atRule.remove()
              },
            },
          },
        ],
      },
      preprocessorOptions: {
        scss: {
          //api: 'modern-compiler',
        },
      },
      devSourcemap: true,
    },
    plugins: createVitePlugin(env),
    define: {},
    // 涓虹敓浜х幆澧冩坊鍔犻鍔犺浇鎸囦护锛屾彁楂樺垵娆¤闂€熷害
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        // 涓篔S鍜孋SS璧勬簮娣诲姞preload锛屾彁楂樿祫婧愬姞杞戒紭鍏堢骇
        if (hostType === 'js' && filename.endsWith('.js')) {
          return { relative: true, preload: true }
        }
        if (hostType === 'css' && filename.endsWith('.css')) {
          return { relative: true, preload: true }
        }
        return { relative: true }
      },
    },
  }
})
