/**
 * @description 导出通用配置
 */
export const settingConfig: {
  [key: string]: string | boolean | number | Array<string>
} = {
  // 标题，此项修改后需要重启项目！！！ (包括初次加载雪花屏的标题 页面的标题 浏览器的标题)
  title: 'Jpai Home',
  // 标题分隔符
  titleSeparator: ' - ',
  // 标题是否反转
  // 如果为false: "page - title"
  // 如果为true : "title - page"
  titleReverse: false,
  // 简写
  abbreviation: 'vab-shop-vite',
  // 付费版本copyright可随意修改
  copyright: 'vuejs-core.cn',
  // 缓存路由的最大数量
  keepAliveMaxNum: 99,
  // 路由模式，是否为hash模式
  isHashRouterMode: true,
  // 不经过token校验的路由，白名单路由建议配置到与login页面同级，如果需要放行带传参的页面，请使用query传参，配置时只配置path即可
  routesWhiteList: [
    '/login',
    '/register',
    '/password',
    '/404',
    '/403',
    '/redirect',
    '/portal',
    '/product',
    '/courses',
    '/dataScreen',
    '/workbench',
  ],
  // 加载时显示文字
  loadingText: '正在加载中...',
  // token名称
  tokenName: 'token',
  // token在localStorage、sessionStorage存储的key的名称
  tokenTableName: 'jpai-token',
  // token存储位置localStorage sessionStorage
  storage: 'localStorage',
  // token失效回退到登录页时是否记录本次的路由（是否记录当前tab页）
  recordRoute: true,
  // 是否开启logo，不显示时设置false，请填写src/icon路径下的图标名称
  // 如需使用内置RemixIcon图标，请自行去logo组件切换注释代码(内置svg雪碧图较大，对性能有一定影响)
  logo: 'vite',
  // 语言类型zh、en
  i18n: 'zh',
  // 消息框消失时间
  messageDuration: 3000,
  // 在哪些环境下显示高亮错误 ['development', 'production']
  errorLog: 'development',
  // 错误过滤配置，这些错误不会被记录到错误日志中
  errorFilter: ['indexOf'],
  // 是否开启登录拦截
  loginInterception: true,
  // 是否开启登录RSA加密
  loginRSA: false,
  // intelligence(前端导出路由)和all(后端导出路由)两种方式
  // authentication: 'intelligence',
  authentication: 'all',
  // 是否支持游客模式，支持情况下，访问白名单，可查看所有asyncRoutes
  supportVisit: false,
  // 是否开启roles字段进行角色权限控制(如果是all模式后端完全处理角色并进行json组装，可设置false不处理路由中的roles字段)
  rolesControl: false,
  // vertical column comprehensive common布局时是否只保持一个子菜单的展开
  uniqueOpened: false,
  // vertical column comprehensive common布局时默认展开的菜单path，使用逗号隔开建议只展开一个
  defaultOpeneds: [
    '/',
    '/vab',
    '/vab/icon',
    '/vab/table',
    '/vab/editor',
    '/vab/form',
    '/operate',
    '/operate/dynamicSegment',
    '/operate/menu1/menu11/menu111',
    '/other',
    '/other/iframe',
    '/template',
    '/goods',
    '/chat',
  ],
  // 需要加loading层的请求，防止重复提交
  debounce: ['doEdit'],
  // 分栏布局和综合布局时，是否点击一级菜单默认开启二级菜单(默认第一个，可通过redirect自定义)
  openFirstMenu: true,
  // 是否持久化多标签页（是否把已开启的路由标签缓存到localStorage中）
  persistenceTab: true,

  //bladex配置-------------------------------------------------------
  key: 'jpai', //配置主键,目前用于存储
  indexTitle: 'BladeX 微服务平台',
  clientId: 'saber3', // 客户端id
  clientSecret: 'saber3_secret', // 客户端密钥
  tenantMode: true, // 是否开启租户模式
  tenantId: '000000', // 管理组租户编号
  captchaMode: true, // 是否开启验证码模式
  captchaType: 'behavior', // 验证码类型(image:首屏图形验证码 behavior:登录时弹出点选/滑块/旋转随机行为验证)
  switchMode: false, // 是否开启登录切换角色部门
  lockPage: '/lock', // 锁屏页面地址
  tokenTime: 3000, // 定时刷新token间隔(单位:毫秒)
  tokenHeader: 'Blade-Auth', // 请求头中携带的token名称
  tokenKey: 'saber3-access-token', // token存储的key(多个系统部署需要修改以免冲突)
  refreshTokenKey: 'saber3-refresh-token', // 刷新token存储的key(多个系统部署需要修改以免冲突)
  //HTTP状态码白名单
  statusWhiteList: [],
  //oauth2配置
  // 必须与 Nacos blade.yaml → blade.oauth2.public-key 一致，否则登录报「认证信息错误或无效」
  publicKey: '048b2583d3c8cd1be7eb6742365edb99a3405ea1a7d3f46fd349e59b35adc256bfe69211436730c2cb5959001a07c7779ec8a354894c40fced30f1b42ba68df1b5',

}
