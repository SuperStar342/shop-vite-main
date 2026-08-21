export const useAclStore = defineStore('acl', {
  state: (): AclModuleType => ({
    admin: false,
    role: [],
    permission: [],
    menuCodes: [],
    menuPaths: [],
    listColumnMap: {},
  }),
  getters: {
    getAdmin: (state) => state.admin,
    getRole: (state) => state.role,
    getPermission: (state) => state.permission,
    getMenuCodes: (state) => state.menuCodes,
    getMenuPaths: (state) => state.menuPaths,
    getListColumnMap: (state) => state.listColumnMap,
  },
  actions: {
    setFull(admin: boolean) {
      this.admin = admin
    },
    setRole(role: string[]) {
      this.role = role || []
    },
    setPermission(permission: string[]) {
      this.permission = permission || []
    },
    setMenuCodes(codes: string[]) {
      this.menuCodes = codes || []
    },
    setMenuPaths(paths: string[]) {
      this.menuPaths = paths || []
    },
    setListColumnMap(map: Record<string, string[]>) {
      this.listColumnMap = map || {}
    },
    /** 退出登录时清空 ACL，避免串账号权限 */
    reset() {
      this.admin = false
      this.role = []
      this.permission = []
      this.menuCodes = []
      this.menuPaths = []
      this.listColumnMap = {}
    },
  },
})
