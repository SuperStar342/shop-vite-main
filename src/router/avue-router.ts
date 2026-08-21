// import website from '@/config/website';
import { getToken } from '/@/utils/auth';
// import store from '/@/store';
import { generateIframePath, processUrlForQuery, isURL } from './routerFun';
// const modules = import.meta.glob('../**/**/*.vue');
import { useUserStore } from '/@/store/modules/user'


// // 将多级路由扁平化为二级路由，支持 keep-alive 跨层级缓存
// function flattenRouteChildren(children) {
//   const result = [];
//   for (const child of children) {
//     if (child.children && child.children.length > 0) {
//       result.push(...flattenRouteChildren(child.children));
//     } else {
//       result.push(child);
//     }
//   }
//   return result;
// }
//
// let RouterPlugin = function () {
//   this.$router = null;
//   this.$store = null;
// };
// RouterPlugin.install = function (option = {}) {
//   this.$router = option.router;
//   this.$store = option.store;
//   let i18n = option.i18n.global;
//   this.$router.$avueRouter = {
//     safe: this,
//     // 设置标题
//     setTitle: title => {
//       const defaultTitle = i18n.t('title');
//       title = title ? `${title} | ${defaultTitle}` : defaultTitle;
//       document.title = title;
//     },
//     closeTag: value => {
//       let tag = value || this.$store.getters.tag;
//       if (typeof value === 'string') {
//         tag = this.$store.getters.tagList.find(ele => ele.fullPath === value);
//       }
//       this.$store.commit('DEL_TAG', tag);
//     },
//     generateTitle: (item, props = {}) => {
//       let query = item[props.query || 'query'] || {};
//       let title = query.name || item[props.label || 'label'];
//       let meta = item[props.meta || 'meta'] || {};
//       let key = meta.i18n;
//       if (key) {
//         const hasKey = i18n.te('route.' + key);
//         if (hasKey) return i18n.t('route.' + key);
//       }
//       return title ? title.split(',')[0] : title;
//     },
//     //动态路由
//     formatRoutes: function (aMenu = [], first) {
//       const aRouter = [];
//       const propsDefault = website.menu;
//
//       if (aMenu && aMenu.length === 0) return;
//       for (let i = 0; i < aMenu.length; i++) {
//         const oMenu = aMenu[i];
//         let path = oMenu[propsDefault.path],
//           isComponent = true,
//           component = oMenu.component,
//           name = oMenu[propsDefault.label] + ',' + oMenu.id,
//           icon = oMenu[propsDefault.icon],
//           children = oMenu[propsDefault.children],
//           query = oMenu[propsDefault.query],
//           meta = oMenu[propsDefault.meta];
//
//         // 处理iframe场景，如果path是URL且是一级路由，需要生成一个内部路径
//         const isUrlPath = isURL(path);
//         if (isUrlPath && first && !children?.length) {
//           // 保存原始URL到query中（如果formatPath还没处理）
//           if (!query || !query.url) {
//             query = { url: processUrlForQuery(path) };
//           }
//           // 生成一个内部路径用于路由
//           const generatedPath = generateIframePath(oMenu, propsDefault.path);
//           if (generatedPath !== path) {
//             path = generatedPath;
//             oMenu[propsDefault.path] = path;
//           }
//           // 确保使用iframe组件
//           if (!component || component.indexOf('iframe') === -1) {
//             component = 'components/iframe/main';
//             oMenu.component = component;
//           }
//         }
//         if (option.keepAlive) {
//           meta.keepAlive = option.keepAlive;
//         }
//         const isChild = !!(children && children.length !== 0);
//         const oRouter = {
//           path: path,
//           component: (() => {
//             // 判断是否为首路由
//             if (first) {
//               return modules[
//                 option.store.getters.isMacOs || !website.setting.menu
//                   ? '../page/index/layout.vue'
//                   : '../page/index/index.vue'
//                 ];
//               // 判断是否为多层路由
//             } else if (isChild && !first) {
//               return modules['../page/index/layout.vue'];
//               // 判断是否为最终的页面视图
//             } else {
//               let result = modules[`../${component}.vue`];
//               if (!result) {
//                 isComponent = false;
//               }
//               return result;
//             }
//           })(),
//           name,
//           icon,
//           meta,
//           query,
//           redirect: (() => {
//             if (!isChild && first) return `${path}`;
//             else return '';
//           })(),
//           // 处理是否为一级路由
//           children: !isChild
//             ? (() => {
//               if (first) {
//                 oMenu[propsDefault.path] = `${path}`;
//                 let componentPath = oMenu.component || component;
//                 let result = modules[`../${componentPath}.vue`];
//                 if (!result) {
//                   isComponent = false;
//                 }
//                 let childName = name + '_index';
//                 let childQuery = oMenu[propsDefault.query] || query;
//                 return [
//                   {
//                     component: result,
//                     icon: icon,
//                     name: childName,
//                     meta: meta,
//                     query: childQuery,
//                     path: '',
//                   },
//                 ];
//               }
//               return [];
//             })()
//             : (() => {
//               return this.formatRoutes(children, false);
//             })(),
//         };
//         const isIframeRoute =
//           component === 'components/iframe/main' || oMenu.component === 'components/iframe/main';
//         if ((!isURL(path) || isIframeRoute) && isComponent) aRouter.push(oRouter);
//       }
//       if (first) {
//         aRouter.forEach(ele => {
//           // 将三级及更深路由扁平化为二级，确保所有叶子组件都由 index.vue 的 keep-alive 统一管理
//           if (ele.children && ele.children.length > 0) {
//             ele.children = flattenRouteChildren(ele.children);
//           }
//           this.safe.$router.addRoute(ele);
//         });
//       } else {
//         return aRouter;
//       }
//     },
//   };
// };

//配置菜单的属性
export const menu = {
  iconDefault: 'menu-line',
  label: 'name',
  path: 'path',
  icon: 'source',
  children: 'children',
  query: 'query',
  href: 'path',
  meta: 'meta',
} as const;

/** 后端 source 为空时，按菜单名/code 补默认图标 */
const resolveMenuIcon = (ele: any, rawIcon: any) => {
  const icon = String(rawIcon || '').trim()
  if (icon && icon !== 'icon-caidan' && icon !== 'null' && icon !== 'undefined') {
    return icon
  }
  const title = String(ele?.name || ele?.title || '')
  const code = String(ele?.code || ele?.alias || '')
  // 系统管理顶级目录
  if (/系统管理/.test(title) || /^(system|System|systemManagement)$/i.test(code)) {
    return 'settings-3-line'
  }
  return menu.iconDefault
}

/**
 * 拆分地址中的参数部分
 */
export function parsePathQuery(fullPath) {
  const splitIndex = fullPath.indexOf('?');
  if (splitIndex === -1) return { path: fullPath, query: {} };
  const query = {};
  new URLSearchParams(fullPath.slice(splitIndex + 1)).forEach((value, key) => {
    query[key] = value;
  });
  return { path: fullPath.slice(0, splitIndex), query };
}


/**
 * 菜单树归一化：把配置在地址中的参数拆入 query 字段
 * 组件解析与路由注册都依赖纯路径，须在 formatPath 之前执行
 */
export function normalizeMenu(menuList = []) {
  const props = menu;
  menuList.forEach(item => {
    const rawPath = item[props.path];
    if (rawPath && !isURL(rawPath) && rawPath.includes('?')) {
      const { path, query } = parsePathQuery(rawPath);
      item[props.path] = path;
      item[props.query] = { ...query, ...(item[props.query] || {}) };
    }
    if (item[props.children] && item[props.children].length) {
      normalizeMenu(item[props.children]);
    }
  });
}

/**
 * 标签键控元数据落位：识别保留参数并写入 meta
 * formatPath 会重建菜单的 meta 对象，须在其之后执行
 */
export function applyTabMeta(menuList = []) {
  const props = menu;
  const SINGLE_TAB_PARAM = '_single';

  menuList.forEach(item => {
    const query = item[props.query];
    if (query && query[SINGLE_TAB_PARAM] !== undefined) {
      delete query[SINGLE_TAB_PARAM];
      item.meta = item.meta || {};
      item.meta.tabKey = 'path';
    }
    if (item[props.children] && item[props.children].length) {
      applyTabMeta(item[props.children]);
    }
  });
}


export function formatMenu(menuList = []) {
  normalizeMenu(menuList);
  menuList.forEach(ele => formatPath(ele, true));
  applyTabMeta(menuList);
}

// export const formatPath = (ele, first) => {
export const formatPath = (ele: any, first: boolean): void => {
  const { userInfo } = useUserStore()

  const propsDefault = menu;
  const icon = resolveMenuIcon(ele, ele[propsDefault.icon])
  // 回写 source，侧边栏与菜单管理展示一致
  if (!ele[propsDefault.icon] || ele[propsDefault.icon] === 'icon-caidan') {
    ele[propsDefault.icon] = icon
  }
  const code = String(ele.code || '')
  const pathStr = String(ele[propsDefault.path] || '')
  // 字典子菜单：系统 / 业务（对齐 shop-vite-main (5) meta.dictBiz）
  const isDictBiz =
    code === 'dictionaryBiz' ||
    code === 'BizDictionaryManagement' ||
    /dictionary\/biz/i.test(pathStr)
  const isDictSystem =
    code === 'dictionarySystem' ||
    code === 'DictionaryManagement' ||
    /dictionary\/system/i.test(pathStr)

  ele.meta = {
    title: ele.name,
    icon,
    noKeepAlive: ele.isOpen !== 2,
    ...(isDictBiz || isDictSystem ? { dictBiz: isDictBiz } : {}),
  };
  ele.name = ele.code


  const iframeComponent = 'components/iframe/main';
  const iframeSrc = href => {
    // 替换&为#
    let processedHref = href.replace(/&/g, '#');

    // 获取用户信息
    // const userInfo = userInfo || {};
    const userToken = getToken() || '';

    // 定义替换参数映射
    const replacements = {
      token: userToken,
      userId: userInfo.userId || '',
      userName: userInfo.userName || '',
      roleName: userInfo.roleName || '',
    };

    // 统一替换所有参数
    Object.entries(replacements).forEach(([key, value]) => {
      const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedHref = processedHref.replace(pattern, value);
    });

    return processedHref;
  };

  const childList = ele[propsDefault.children];
  const isChild = !!childList?.length;

  /** 保留 blade_menu.component；仅在库表未填时用 path 回退 */
  const fallbackComponent = (item: any) => {
    const existing = item.component
    if (existing && existing !== 'Layout' && String(existing).trim()) return existing
    const p = item[propsDefault.path]
    if (!p) return existing
    return `views${String(p).startsWith('/') ? p : `/${p}`}`
  }

  if (isChild) {
    ele.component = 'Layout'
  }
  if (!isChild && first) {
    ele.component = fallbackComponent(ele)
    if (isURL(ele[propsDefault.href])) {
      const href = ele[propsDefault.href]
      ele.component = iframeComponent
      ele[propsDefault.query] = {
        url: iframeSrc(href),
      }
    }
  } else {
    childList?.forEach((child) => {
      const childHref = child[propsDefault.href]
      if (childHref && isURL(childHref)) {
        child[propsDefault.path] = `${ele[propsDefault.path]}/${child.code}`
        child.component = iframeComponent
        child[propsDefault.query] = { url: iframeSrc(childHref) }
      } else {
        child.component = fallbackComponent(child)
      }
      formatPath(child, false)
    })
  }
};
// export default RouterPlugin;
