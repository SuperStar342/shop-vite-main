// 导入其他模块路由
import { chatRoutes } from './chat'
import { goodsRoutes } from './goods'
import { homeRoutes } from './home'
import { noColumnRoutes } from './noColumn'
import { operateRoutes } from './operate'
import { otherRoutes } from './other'
import { portalRoutes } from './portal'
import { settingRoutes } from './setting'
import { templateRoutes } from './template'
import { vabRoutes } from './vab'

// 导出所有模块路由
export const asyncRoutes = [
  ...homeRoutes,
  ...vabRoutes,
  ...otherRoutes,
  ...operateRoutes,
  ...templateRoutes,
  ...settingRoutes,
  ...noColumnRoutes,
  ...goodsRoutes,
  ...chatRoutes,
  ...portalRoutes,
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    name: 'NotFound',
    meta: {
      title: '404',
      hidden: true,
    },
  },
]

// 单独导出各个模块路由，方便按需使用

export { chatRoutes } from './chat'
export { goodsRoutes } from './goods'
export { homeRoutes } from './home'
export { noColumnRoutes } from './noColumn'
export { operateRoutes } from './operate'
export { otherRoutes } from './other'
export { portalRoutes } from './portal'
export { settingRoutes } from './setting'
export { templateRoutes } from './template'
export { vabRoutes } from './vab'
