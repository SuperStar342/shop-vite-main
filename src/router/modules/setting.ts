import Layout from '/@vab/layouts/index.vue'

export const settingRoutes = [
  {
    path: '/setting',
    name: 'PersonnelManagement',
    component: Layout,
    meta: {
      title: '系统管理',
      icon: 'settings-3-line',
      guard: ['Admin'],
    },
    children: [
      {
        path: 'personalCenter',
        name: 'PersonalCenter',
        component: () => import('/@/views/setting/personalCenter/index.vue'),
        meta: {
          title: '个人中心',
          icon: 'user-follow-line',
        },
      },
      {
        path: 'userManagement',
        name: 'UserManagement',
        component: () => import('/@/views/setting/userManagement/index.vue'),
        meta: {
          title: '用户管理',
          icon: 'user-3-line',
        },
      },
      {
        path: 'roleManagement',
        name: 'RoleManagement',
        component: () => import('/@/views/setting/roleManagement/index.vue'),
        meta: {
          title: '角色管理',
          icon: 'admin-line',
        },
      },
      {
        path: 'departmentManagement',
        name: 'DepartmentManagement',
        component: () => import('/@/views/setting/departmentManagement/index.vue'),
        meta: {
          title: '部门管理',
          icon: 'group-line',
        },
      },
      {
        path: 'teamManagement',
        name: 'TeamManagement',
        component: () => import('/@/views/setting/teamManagement/index.vue'),
        meta: {
          title: '团队管理',
          icon: 'team-line',
        },
      },
      {
        path: 'menuManagement',
        name: 'MenuManagement',
        component: () => import('/@/views/setting/menuManagement/index.vue'),
        meta: {
          title: '菜单管理',
          icon: 'menu-2-fill',
        },
      },
      {
        path: 'dictionaryManagement',
        name: 'DictionaryManagement',
        component: () => import('/@/views/setting/dictionaryManagement/index.vue'),
        meta: {
          title: '字典管理',
          icon: 'book-2-line',
          dot: true,
        },
      },
      {
        path: 'taskManagement',
        name: 'TaskManagement',
        component: () => import('/@/views/setting/taskManagement/index.vue'),
        meta: {
          title: '任务管理',
          icon: 'task-line',
          badge: 'New',
        },
      },
      {
        path: 'iotManagement',
        name: 'IotManagement',
        component: () => import('/@/views/setting/iotManagement/index.vue'),
        meta: {
          title: '物联网管理',
          icon: 'mastercard-line',
          badge: 'New',
        },
      },
      {
        path: 'serverManagement',
        name: 'ServerManagement',
        component: () => import('/@/views/setting/serverManagement/index.vue'),
        meta: {
          title: '服务器管理',
          icon: 'server-line',
          dot: true,
        },
      },
      {
        path: 'systemLog',
        name: 'SystemLog',
        component: () => import('/@/views/setting/systemLog/index.vue'),
        meta: {
          title: '系统日志',
          icon: 'file-shield-2-line',
        },
      },
      {
        path: 'performanceMonitor',
        name: 'PerformanceMonitor',
        component: () => import('/@/views/setting/performanceMonitor/index.vue'),
        meta: {
          title: '性能监控',
          icon: 'dashboard-line',
        },
      },
      {
        path: 'websiteSetting',
        name: 'WebsiteSetting',
        component: () => import('/@/views/setting/websiteSetting/index.vue'),
        meta: {
          title: '网站设置',
          icon: 'global-line',
        },
      },
    ],
  },
]
