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
    console.log(`构建时间: ${lastBuildTime}`)
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
      proxy: {
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
      warmup: {
        clientFiles: ['./index.html', './library/{components,layouts}/*', './src/{views,plugins}/*'],
      },
      https,
      fs: {},
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
    // 为生产环境添加预加载指令，提高初次访问速度
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        // 为JS和CSS资源添加preload，提高资源加载优先级
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
