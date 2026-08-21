<template>
  <vab-dialog
    v-model="dialogVisible"
    append-to-body
    class="role-permission-dialog"
    :title="dialogTitle"
    width="900px"
    @close="handleClose"
  >
    <div v-loading="loading" class="permission-config">
      <div class="permission-role">当前角色：{{ roleName }}</div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="菜单权限" name="menu">
          <div class="tab-toolbar">
            <span class="toolbar-left">
              <el-switch v-model="menuLinked" active-text="节点联动" size="small" />
              <el-tooltip content="开启后勾选父节点会自动勾选子节点；关闭则可独立勾选" placement="top">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small" plain :icon="treeExpand.menu ? Fold : Expand" @click="toggleTreeExpand('menu')">
                {{ treeExpand.menu ? '全部折叠' : '全部展开' }}
              </el-button>
              <el-button size="small" plain @click="selectAll('menu')">全选</el-button>
              <el-button size="small" plain @click="invertSelect('menu')">反选</el-button>
            </el-button-group>
          </div>
          <el-alert
            :closable="false"
            show-icon
            title="菜单树来自数据库（数字 id）。保存时会自动补齐父级菜单，确保非管理员角色侧边栏完整。若为空请先导入菜单库表。"
            type="info"
            class="tab-alert"
          />
          <div class="tree-box">
            <el-tree
              v-if="menuTree.length"
              ref="menuTreeRef"
              :check-strictly="!menuLinked"
              :data="menuTree"
              default-expand-all
              node-key="id"
              :props="treeProps"
              show-checkbox
            />
            <el-empty v-else description="暂无菜单数据" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="数据权限" name="dataScope">
          <div class="tab-toolbar">
            <span class="toolbar-left">
              <el-switch v-model="dataScopeLinked" active-text="节点联动" size="small" />
              <el-tooltip content="行级过滤：限制角色能看哪些数据行。请在「权限管理 → 数据权限」维护规则。" placement="top">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small" plain :icon="treeExpand.dataScope ? Fold : Expand" @click="toggleTreeExpand('dataScope')">
                {{ treeExpand.dataScope ? '全部折叠' : '全部展开' }}
              </el-button>
              <el-button size="small" plain @click="selectAll('dataScope')">全选</el-button>
              <el-button size="small" plain @click="invertSelect('dataScope')">反选</el-button>
            </el-button-group>
          </div>
          <el-alert
            :closable="false"
            show-icon
            title="数据权限用于行级过滤。列显隐请使用「列表权限」Tab。"
            type="info"
            class="tab-alert"
          />
          <div class="tree-box">
            <el-tree
              v-if="dataScopeTree.length"
              ref="dataScopeTreeRef"
              :check-strictly="!dataScopeLinked"
              :data="dataScopeTree"
              default-expand-all
              node-key="id"
              :props="treeProps"
              show-checkbox
            />
            <el-empty v-else description="暂无数据权限（请先维护数据权限规则）" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="列表权限" name="listColumn">
          <el-alert
            :closable="false"
            show-icon
            class="tab-alert"
            type="info"
            title="仅展示「菜单权限」已勾选菜单对应的列表页。全选列=不限制（删除配置）；部分列=仅这些列可见。保存后当前会话会刷新；其他用户需重新登录生效。"
          />
          <div class="list-column-layout">
            <div class="page-pane">
              <el-input v-model.trim="pageFilter" clearable placeholder="筛选页面" size="small" class="page-filter" />
              <el-scrollbar max-height="380px">
                <div v-if="!filteredPageGroups.length" class="page-empty-tip">
                  请先在「菜单权限」中勾选菜单，再配置对应列表列
                </div>
                <div v-for="g in filteredPageGroups" :key="g.group" class="page-group">
                  <div class="page-group-title">{{ g.group }}</div>
                  <div
                    v-for="p in g.pages"
                    :key="p.pageCode"
                    class="page-item"
                    :class="{ active: activeListPage === p.pageCode, configured: configuredPages.has(p.pageCode) }"
                    @click="activeListPage = p.pageCode"
                  >
                    <span>{{ p.pageName }}</span>
                    <el-tag v-if="configuredPages.has(p.pageCode)" size="small" effect="plain" type="success">已配</el-tag>
                  </div>
                </div>
              </el-scrollbar>
            </div>
            <div class="column-pane">
              <div class="column-toolbar">
                <span class="column-title">{{ currentListPage?.pageName || '请选择页面' }}</span>
                <el-button-group>
                  <el-button size="small" plain :disabled="!activeListPage" @click="selectAllListColumns">全选</el-button>
                  <el-button size="small" plain :disabled="!activeListPage" @click="invertListColumns">反选</el-button>
                  <el-button
                    size="small"
                    plain
                    type="danger"
                    :disabled="!activeListPage || !configuredPages.has(activeListPage)"
                    @click="clearListPageConfig"
                  >
                    清除本页
                  </el-button>
                </el-button-group>
              </div>
              <el-scrollbar v-if="currentListPage" max-height="340px">
                <el-checkbox-group v-model="currentCheckedColumns">
                  <el-checkbox
                    v-for="c in currentListPage.columns"
                    :key="c.prop"
                    :label="c.prop"
                    border
                    class="col-check"
                  >
                    {{ c.label }}
                    <span class="prop-code">({{ c.prop }})</span>
                  </el-checkbox>
                </el-checkbox-group>
              </el-scrollbar>
              <el-empty v-else description="请选择左侧页面" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="接口权限" name="apiScope">
          <div class="tab-toolbar">
            <span class="toolbar-left">
              <el-switch v-model="apiScopeLinked" active-text="节点联动" size="small" />
              <el-tooltip content="树节点为菜单，叶子为接口权限。建议勾选叶子节点；可在「接口权限」菜单维护规则。" placement="top">
                <el-icon class="tip-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-button-group>
              <el-button size="small" plain :icon="treeExpand.apiScope ? Fold : Expand" @click="toggleTreeExpand('apiScope')">
                {{ treeExpand.apiScope ? '全部折叠' : '全部展开' }}
              </el-button>
              <el-button size="small" plain @click="selectAll('apiScope')">全选</el-button>
              <el-button size="small" plain @click="invertSelect('apiScope')">反选</el-button>
            </el-button-group>
          </div>
          <el-alert
            :closable="false"
            show-icon
            title="接口权限树来自 /menu/grant-tree 的 apiScope。若无叶子节点，请先在「权限管理 → 接口权限」中按菜单配置规则。"
            type="info"
            class="tab-alert"
          />
          <div class="tree-box">
            <el-tree
              v-if="apiScopeTree.length"
              ref="apiScopeTreeRef"
              :check-strictly="!apiScopeLinked"
              :data="apiScopeTree"
              default-expand-all
              node-key="id"
              :props="treeProps"
              show-checkbox
            />
            <el-empty v-else description="暂无接口权限（请先维护接口权限规则）" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="saving" type="primary" @click="savePermission">保存权限</el-button>
    </template>
  </vab-dialog>
</template>

<script lang="ts" setup>
import { Expand, Fold, QuestionFilled } from '@element-plus/icons-vue'
import type { ElTree } from 'element-plus'
import {
  getListColumnByRole,
  removeListColumnByRolePage,
  submitListColumnBatch,
} from '/@/api/listColumnPermission'
import { getGrantTree, getRoleMenuTree } from '/@/api/menuManagement'
import { grantRole } from '/@/api/roleManagement'
import {
  LIST_COLUMN_PAGES,
  getListPagesGrouped,
  getListPage,
  pageMatchesMenuCodes,
} from '/@/config/listColumnRegistry'
import { $baseMessage } from '/@/hooks'
import { afterSaveFail, afterSaveSuccess } from '/@/utils/formDialog'
import { useRoutesStore } from '/@/store/modules/routes'
import { useUserStore } from '/@/store/modules/user'

defineOptions({
  name: 'RolePermissionConfig',
})

type ScopeTab = 'menu' | 'dataScope' | 'apiScope' | 'listColumn'

const dialogVisible = ref(false)
const dialogTitle = ref('')
const roleId = ref('')
const roleName = ref('')
const loading = ref(false)
const saving = ref(false)
const activeTab = ref<ScopeTab>('menu')

// 默认关闭联动，避免勾父节点时误授全部子菜单；需要时再打开
const menuLinked = ref(false)
const dataScopeLinked = ref(false)
const apiScopeLinked = ref(false)

/** 各权限树展开状态：true=已展开 */
const treeExpand = reactive({
  menu: true,
  dataScope: true,
  apiScope: true,
})

const menuTree = ref<any[]>([])
const dataScopeTree = ref<any[]>([])
const apiScopeTree = ref<any[]>([])
/** 角色已授权 keys 是否成功加载（失败时禁止空保存，避免清空授权） */
const roleKeysLoaded = ref(true)

const menuTreeRef = ref<InstanceType<typeof ElTree>>()
const dataScopeTreeRef = ref<InstanceType<typeof ElTree>>()
const apiScopeTreeRef = ref<InstanceType<typeof ElTree>>()

const treeProps = { label: 'label', children: 'children' }

/** pageCode -> 勾选的列 prop */
const listColumnChecked = reactive<Record<string, string[]>>({})
/** 原本库里已有配置的页面 */
const configuredPages = ref<Set<string>>(new Set())
const activeListPage = ref(LIST_COLUMN_PAGES[0]?.pageCode || '')
const pageFilter = ref('')
const dirtyListPages = ref<Set<string>>(new Set())
/** 切换到列表权限 Tab 时刷新，以便读取最新菜单勾选 */
const menuCheckTick = ref(0)

/** 从菜单树已勾选节点收集 code/alias/中文名，用于过滤可配列表页 */
const collectCheckedMenuCodes = (): Set<string> => {
  void menuCheckTick.value
  const codes = new Set<string>()
  const tree = menuTreeRef.value
  if (!tree || !menuTree.value.length) return codes
  const checked = new Set<string>([
    ...((tree.getCheckedKeys(false) || []) as Array<string | number>).map(String),
    ...((tree.getHalfCheckedKeys() || []) as Array<string | number>).map(String),
  ])
  if (!checked.size) return codes
  const walk = (nodes: any[]) => {
    ;(nodes || []).forEach((n) => {
      if (checked.has(String(n.id))) {
        ;[n.code, n.alias, n.menuName, n.title, n.label, n.name, n.path]
          .filter((c) => c != null && String(c).trim() !== '')
          .forEach((c) => {
            const s = String(c).trim()
            // 纯数字 id 不能当菜单编码匹配
            if (/^\d+$/.test(s)) return
            codes.add(s)
          })
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(menuTree.value)
  return codes
}

const pageGroups = computed(() => {
  const menuCodes = collectCheckedMenuCodes()
  const grouped = getListPagesGrouped()
  // 仅展示与「菜单权限」已勾选菜单匹配的列表页
  if (!menuCodes.size) return []
  return grouped
    .map((g) => ({
      group: g.group,
      pages: g.pages.filter((p) => pageMatchesMenuCodes(p, menuCodes)),
    }))
    .filter((g) => g.pages.length)
})

const filteredPageGroups = computed(() => {
  const kw = pageFilter.value.trim().toLowerCase()
  if (!kw) return pageGroups.value
  return pageGroups.value
    .map((g) => ({
      group: g.group,
      pages: g.pages.filter(
        (p) => p.pageName.toLowerCase().includes(kw) || p.pageCode.toLowerCase().includes(kw)
      ),
    }))
    .filter((g) => g.pages.length)
})

watch(activeTab, async (tab) => {
  if (tab !== 'listColumn') return
  menuCheckTick.value++
  await nextTick()
  const pages = filteredPageGroups.value.flatMap((g) => g.pages)
  if (!pages.length) return
  if (!pages.some((p) => p.pageCode === activeListPage.value)) {
    activeListPage.value = pages[0].pageCode
  }
  // 确保 checkbox 状态已初始化
  pages.forEach((p) => {
    if (!listColumnChecked[p.pageCode]) {
      listColumnChecked[p.pageCode] = p.columns.map((c) => c.prop)
    }
  })
})

const currentListPage = computed(() => getListPage(activeListPage.value))

const currentCheckedColumns = computed({
  get: () => listColumnChecked[activeListPage.value] || [],
  set: (val: string[]) => {
    if (!activeListPage.value) return
    listColumnChecked[activeListPage.value] = val
    dirtyListPages.value.add(activeListPage.value)
  },
})

const initListColumnState = () => {
  LIST_COLUMN_PAGES.forEach((p) => {
    listColumnChecked[p.pageCode] = p.columns.map((c) => c.prop)
  })
  configuredPages.value = new Set()
  dirtyListPages.value = new Set()
}

const loadListColumns = async () => {
  initListColumnState()
  if (!roleId.value) return
  try {
    const list = await getListColumnByRole(roleId.value)
    const configured = new Set<string>()
    ;(list || []).forEach((row: any) => {
      const code = String(row.pageCode || '')
      if (!code) return
      configured.add(code)
      const cols = String(row.visibleColumns || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
      listColumnChecked[code] = cols
    })
    configuredPages.value = configured
  } catch (e: any) {
    console.warn('加载列表列权限失败', e)
  }
}

const isAllColumnsSelected = (pageCode: string) => {
  const page = getListPage(pageCode)
  if (!page) return true
  const checked = new Set(listColumnChecked[pageCode] || [])
  return page.columns.length > 0 && page.columns.every((c) => checked.has(c.prop))
}

const selectAllListColumns = () => {
  const page = currentListPage.value
  if (!page) return
  currentCheckedColumns.value = page.columns.map((c) => c.prop)
}

const invertListColumns = () => {
  const page = currentListPage.value
  if (!page) return
  const set = new Set(currentCheckedColumns.value)
  currentCheckedColumns.value = page.columns.map((c) => c.prop).filter((p) => !set.has(p))
}

const clearListPageConfig = async () => {
  const code = activeListPage.value
  if (!code || !roleId.value) return
  const page = getListPage(code)
  listColumnChecked[code] = page ? page.columns.map((c) => c.prop) : []
  dirtyListPages.value.add(code)
  if (configuredPages.value.has(code)) {
    try {
      await removeListColumnByRolePage(roleId.value, code)
      const next = new Set(configuredPages.value)
      next.delete(code)
      configuredPages.value = next
      $baseMessage('已清除本页列限制', 'success', 'hey')
    } catch (e: any) {
      $baseMessage(e?.message || e?.msg || '清除失败', 'error', 'hey')
    }
  }
}

const saveListColumns = async () => {
  if (!roleId.value) return
  const pagesToSave = new Set<string>([...dirtyListPages.value, ...configuredPages.value])
  const toSubmit: any[] = []
  const toClear: string[] = []

  pagesToSave.forEach((pageCode) => {
    const page = getListPage(pageCode)
    if (!page) return
    const checked = listColumnChecked[pageCode] || []
    if (!checked.length) {
      if (configuredPages.value.has(pageCode) || dirtyListPages.value.has(pageCode)) {
        toClear.push(pageCode)
      }
      return
    }
    if (isAllColumnsSelected(pageCode)) {
      // 全选 = 不限制，有旧配置则清除
      if (configuredPages.value.has(pageCode)) toClear.push(pageCode)
      return
    }
    toSubmit.push({
      roleId: roleId.value,
      pageCode,
      pageName: page.pageName,
      visibleColumns: checked.join(','),
    })
  })

  for (const pageCode of toClear) {
    await removeListColumnByRolePage(roleId.value, pageCode)
  }
  if (toSubmit.length) {
    await submitListColumnBatch(toSubmit)
  }
  const next = new Set(configuredPages.value)
  toClear.forEach((c) => next.delete(c))
  toSubmit.forEach((item) => next.add(item.pageCode))
  configuredPages.value = next
  dirtyListPages.value = new Set()
}

const getTreeRef = (tab: 'menu' | 'dataScope' | 'apiScope') => {
  if (tab === 'menu') return menuTreeRef.value
  if (tab === 'dataScope') return dataScopeTreeRef.value
  return apiScopeTreeRef.value
}

const getTreeData = (tab: 'menu' | 'dataScope' | 'apiScope') => {
  if (tab === 'menu') return menuTree.value
  if (tab === 'dataScope') return dataScopeTree.value
  return apiScopeTree.value
}

const collectAllKeys = (nodes: any[], acc: string[] = []) => {
  nodes.forEach((n) => {
    acc.push(String(n.id))
    if (n.children?.length) collectAllKeys(n.children, acc)
  })
  return acc
}

const collectLeafKeys = (nodes: any[], acc: string[] = []) => {
  nodes.forEach((n) => {
    if (n.children?.length) collectLeafKeys(n.children, acc)
    else acc.push(String(n.id))
  })
  return acc
}

const applyCheckedKeys = async (tab: 'menu' | 'dataScope' | 'apiScope', keys: string[]) => {
  await nextTick()
  await nextTick()
  getTreeRef(tab)?.setCheckedKeys((keys || []).map(String), false)
}

const showConfig = async (row: any) => {
  roleId.value = String(row.id)
  roleName.value = row.roleName || row.role || ''
  dialogTitle.value = `权限配置 - ${roleName.value}`
  activeTab.value = 'menu'
  dialogVisible.value = true
  menuTree.value = []
  dataScopeTree.value = []
  apiScopeTree.value = []
  roleKeysLoaded.value = true
  initListColumnState()
  treeExpand.menu = true
  treeExpand.dataScope = true
  treeExpand.apiScope = true
  loading.value = true
  try {
    const treeRes: any = await getGrantTree()
    menuTree.value = treeRes?.data?.menu || []
    dataScopeTree.value = treeRes?.data?.dataScope || []
    apiScopeTree.value = treeRes?.data?.apiScope || []

    let menuKeys: string[] = []
    let dataKeys: string[] = []
    let apiKeys: string[] = []
    const keysRes: any = await getRoleMenuTree(roleId.value)
    roleKeysLoaded.value = keysRes?.loaded !== false && keysRes?.success !== false
    if (!roleKeysLoaded.value) {
      $baseMessage(keysRes?.msg || '未能加载该角色已有权限，请检查账号是否具备角色管理权限', 'warning', 'hey')
    } else {
      menuKeys = keysRes?.data?.menu || []
      dataKeys = keysRes?.data?.dataScope || []
      apiKeys = keysRes?.data?.apiScope || []
    }

    await applyCheckedKeys('menu', menuKeys)
    await applyCheckedKeys('dataScope', dataKeys)
    await applyCheckedKeys('apiScope', apiKeys)
    await loadListColumns()

    if (!menuTree.value.length) {
      $baseMessage('库表暂无菜单，请先到菜单管理「从路由导入库表」', 'warning', 'hey')
    } else if (treeRes?.msg && String(treeRes.msg).includes('已从')) {
      $baseMessage(treeRes.msg, 'info', 'hey')
    }
  } catch (e: any) {
    menuTree.value = []
    dataScopeTree.value = []
    apiScopeTree.value = []
    $baseMessage(e?.message || e?.msg || '加载权限树失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

defineExpose({ showConfig })

const expandAll = (tab: 'menu' | 'dataScope' | 'apiScope', expand: boolean) => {
  const tree = getTreeRef(tab)
  if (!tree) return
  const store = (tree as any).store
  const nodes: any[] = store?._getAllNodes?.() || Object.values(store?.nodesMap || {})
  nodes.forEach((node) => {
    if (node && typeof node.expanded === 'boolean') {
      node.expanded = expand
    }
  })
  treeExpand[tab] = expand
}

const toggleTreeExpand = (tab: 'menu' | 'dataScope' | 'apiScope') => {
  expandAll(tab, !treeExpand[tab])
}

const selectAll = (tab: 'menu' | 'dataScope' | 'apiScope') => {
  applyCheckedKeys(tab, collectAllKeys(getTreeData(tab)))
}

const invertSelect = (tab: 'menu' | 'dataScope' | 'apiScope') => {
  const tree = getTreeRef(tab)
  if (!tree) return
  const all = collectAllKeys(getTreeData(tab))
  const checked = new Set((tree.getCheckedKeys(false) || []).map(String))
  applyCheckedKeys(
    tab,
    all.filter((k) => !checked.has(k))
  )
}

/** 构建 id → parentId，用于保存时补齐祖先节点（非管理员侧边栏依赖父级菜单） */
const buildParentMap = (nodes: any[], parentId: string | null = null, map = new Map<string, string | null>()) => {
  ;(nodes || []).forEach((n) => {
    const id = String(n.id)
    map.set(id, parentId)
    if (n.children?.length) buildParentMap(n.children, id, map)
  })
  return map
}

const collectAncestors = (id: string, parentMap: Map<string, string | null>, acc: Set<string>) => {
  let cur = parentMap.get(id) ?? null
  while (cur) {
    if (acc.has(cur)) break
    acc.add(cur)
    cur = parentMap.get(cur) ?? null
  }
}

/**
 * 收集要写入 blade_role_menu 的菜单 id：
 * - 勾选节点
 * - 半选父节点（联动模式）
 * - 始终补齐祖先（即使关闭联动），否则非管理员 /menu/routes 拿不到完整树
 */
const collectMenuIds = () => {
  const tree = menuTreeRef.value
  if (!tree) return [] as string[]
  const checked = ((tree.getCheckedKeys(false) || []) as Array<string | number>).map(String)
  const half = ((tree.getHalfCheckedKeys() || []) as Array<string | number>).map(String)
  const ids = new Set<string>([...checked, ...half])
  const parentMap = buildParentMap(menuTree.value)
  checked.forEach((id) => collectAncestors(id, parentMap, ids))
  return [...ids]
}

const collectScopeLeafIds = (tab: 'dataScope' | 'apiScope') => {
  const tree = getTreeRef(tab)
  if (!tree) return [] as string[]
  const checked = new Set((tree.getCheckedKeys(false) || []).map(String))
  const leaves = collectLeafKeys(getTreeData(tab))
  if (leaves.length && getTreeData(tab).some((n) => n.children?.length)) {
    return leaves.filter((id) => checked.has(id))
  }
  return [...checked]
}

const savePermission = async () => {
  if (!roleId.value) return
  saving.value = true
  try {
    if (!menuTree.value.length) {
      throw new Error('权限树未加载，无法保存')
    }
    const menuIds = collectMenuIds()
    // 已授权 keys 加载失败时，禁止空保存，避免把角色菜单清空
    if (!roleKeysLoaded.value && !menuIds.length) {
      throw new Error('未能加载该角色原有权限，已阻止空保存。请刷新后重试，或重新勾选菜单再保存')
    }
    const dataScopeIds = collectScopeLeafIds('dataScope')
    const apiScopeIds = collectScopeLeafIds('apiScope')
    await grantRole({
      roleIds: [roleId.value],
      menuIds,
      dataScopeIds,
      apiScopeIds,
    })
    try {
      await saveListColumns()
    } catch (listErr: any) {
      const msg = String(listErr?.message || listErr?.msg || '')
      if (/blade_role_list_column|doesn't exist|不存在|Table/i.test(msg)) {
        throw new Error(
          '菜单权限已保存，但列表列权限表不存在。请先执行 sql/blade_role_list_column.mysql.sql 后重启 blade-system'
        )
      }
      throw new Error(msg || '列表列权限保存失败')
    }
    await afterSaveSuccess(dialogVisible, '权限配置成功')
    await refreshCurrentUserPermissions()
  } catch (e: any) {
    afterSaveFail(e, '权限配置失败')
  } finally {
    saving.value = false
  }
}

const refreshCurrentUserPermissions = async () => {
  try {
    const userStore = useUserStore()
    const routesStore = useRoutesStore()
    // 当前 store 方法名为 GetUserInfo（Saber 风格）
    if (typeof (userStore as any).GetUserInfo === 'function') {
      await (userStore as any).GetUserInfo()
    } else if (typeof (userStore as any).getUserInfo === 'function') {
      await (userStore as any).getUserInfo()
    }
    await routesStore.clearRoutes()
    await routesStore.setRoutes()
    $baseMessage('权限已更新，菜单将重新加载', 'success', 'hey')
  } catch (e: any) {
    console.warn('刷新权限失败', e)
    $baseMessage('权限已保存，请重新登录后生效', 'success', 'hey')
  }
}

const handleClose = () => {
  dialogVisible.value = false
  menuTree.value = []
  dataScopeTree.value = []
  apiScopeTree.value = []
  initListColumnState()
  nextTick(() => {
    menuTreeRef.value?.setCheckedKeys([])
    dataScopeTreeRef.value?.setCheckedKeys([])
    apiScopeTreeRef.value?.setCheckedKeys([])
  })
}
</script>

<style lang="scss" scoped>
.permission-config {
  .permission-role {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
  }

  .tab-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 6px 10px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
  }

  .toolbar-left {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .tip-icon {
    color: var(--el-text-color-secondary);
    cursor: help;
  }

  .tab-alert {
    margin-bottom: 12px;
  }

  .tree-box {
    max-height: 420px;
    overflow-y: auto;
    padding: 4px 8px 4px 0;
  }

  .list-column-layout {
    display: flex;
    gap: 12px;
    min-height: 400px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    overflow: hidden;
  }

  .page-pane {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-blank);
    padding: 8px;
  }

  .page-filter {
    margin-bottom: 8px;
  }

  .page-empty-tip {
    padding: 24px 12px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    text-align: center;
    line-height: 1.6;
  }

  .page-group-title {
    padding: 6px 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .page-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 2px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }

  .column-pane {
    flex: 1;
    padding: 10px 12px;
    min-width: 0;
  }

  .column-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .column-title {
    font-weight: 500;
  }

  .col-check {
    margin: 0 10px 10px 0;
  }

  .prop-code {
    margin-left: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>
