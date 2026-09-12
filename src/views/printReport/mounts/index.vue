<template>
  <div class="print-report-mounts auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="24">
        <el-form inline @submit.prevent>
          <el-form-item>
            <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-left-panel>
    </vab-query-form>

    <el-table
      v-loading="loading"
      border
      class="prm-table"
      :data="mountList"
      height="100%"
      highlight-current-row
      stripe
      @current-change="onMountSelect"
    >
      <el-table-column label="单据类型" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ docTypeName(row.docTypeCode) }}
          <span class="prm-muted">({{ row.docTypeCode }})</span>
        </template>
      </el-table-column>
      <el-table-column label="pageCode" min-width="200" prop="pageCode" show-overflow-tooltip />
      <el-table-column label="业务页名称" min-width="160" prop="pageName" show-overflow-tooltip />
      <el-table-column align="center" label="启用" min-width="90">
        <template #default="{ row }">
          <el-tag effect="light" round size="small" :type="row.enabled === 1 ? 'success' : 'info'">
            {{ row.enabled === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无挂载配置" />
      </template>
    </el-table>

    <section v-if="selectedMount" class="prm-auth">
      <header class="prm-auth__head">
        <span>设计授权 — {{ docTypeName(selectedMount.docTypeCode) }}</span>
        <el-button :loading="authSaving" size="small" type="primary" @click="saveAuths">保存授权</el-button>
      </header>
      <p class="prm-auth__hint">
        勾选可设计该单据类型报表模板的角色；管理员不受此限制。
      </p>
      <el-select
        v-if="roleOptions.length"
        v-model="selectedRoleIds"
        collapse-tags
        collapse-tags-tooltip
        filterable
        multiple
        placeholder="选择角色"
        style="width: 100%"
      >
        <el-option
          v-for="r in roleOptions"
          :key="r.id"
          :label="`${r.roleName}${r.roleAlias ? ` (${r.roleAlias})` : ''}`"
          :value="Number(r.id)"
        />
      </el-select>
      <el-input
        v-else
        v-model="roleIdsText"
        placeholder="角色 API 不可用时，输入 roleId，逗号分隔，如 112233,445566"
        :rows="2"
        type="textarea"
      />
    </section>

    <el-dialog v-model="editVisible" append-to-body title="编辑挂载" width="480px">
      <el-form label-width="100px" :model="editForm">
        <el-form-item label="单据类型">
          <el-input disabled :model-value="`${docTypeName(editForm.docTypeCode)} (${editForm.docTypeCode})`" />
        </el-form-item>
        <el-form-item label="pageCode">
          <el-input v-model.trim="editForm.pageCode" maxlength="64" placeholder="业务页标识" />
          <div class="prm-warn">慎改 pageCode，需与业务页常量一致</div>
        </el-form-item>
        <el-form-item label="业务页名称">
          <el-input v-model.trim="editForm.pageName" maxlength="128" placeholder="展示名称" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editForm.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button :loading="editSaving" type="primary" @click="confirmEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getList as getRoleList } from '/@/api/roleManagement'
import {
  listDocTypeAuths,
  listDocTypes,
  listMounts,
  replaceDocTypeAuths,
  submitMount,
  type PrintDocType,
} from '/@/api/print/reportCenter'

defineOptions({ name: 'PrintReportMounts' })

type PrintMount = {
  id?: number
  docTypeId?: number
  docTypeCode: string
  pageCode: string
  pageName: string
  enabled: number
  sort?: number
}

const loading = ref(false)
const mountList = ref<PrintMount[]>([])
const docTypeList = ref<PrintDocType[]>([])
const selectedMount = ref<PrintMount | null>(null)

const docTypeName = (code: string) =>
  docTypeList.value.find((d) => d.code === code)?.name || code

const flattenRoles = (nodes: any[], acc: any[] = []) => {
  for (const n of nodes || []) {
    acc.push(n)
    if (n.children?.length) flattenRoles(n.children, acc)
  }
  return acc
}

const roleOptions = ref<any[]>([])
const selectedRoleIds = ref<number[]>([])
const roleIdsText = ref('')
const authSaving = ref(false)

const fetchDocTypes = async () => {
  try {
    docTypeList.value = await listDocTypes()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载单据类型失败')
  }
}

const fetchRoles = async () => {
  try {
    const res = await getRoleList()
    roleOptions.value = flattenRoles(res?.data?.list || res?.data || [])
  } catch {
    roleOptions.value = []
  }
}

const fetchMounts = async () => {
  loading.value = true
  try {
    mountList.value = (await listMounts()) as PrintMount[]
  } catch (e: any) {
    mountList.value = []
    ElMessage.error(e?.message || '加载挂载列表失败')
  } finally {
    loading.value = false
  }
}

const loadAuths = async (docTypeCode: string) => {
  selectedRoleIds.value = []
  roleIdsText.value = ''
  try {
    const auths: any[] = await listDocTypeAuths(docTypeCode)
    const ids = auths.map((a) => Number(a.roleId ?? a.role_id)).filter((id) => !Number.isNaN(id))
    if (roleOptions.value.length) {
      selectedRoleIds.value = ids
    } else {
      roleIdsText.value = ids.join(',')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载授权失败')
  }
}

const onMountSelect = (row: PrintMount | null) => {
  selectedMount.value = row
  if (row?.docTypeCode) loadAuths(row.docTypeCode)
}

const parseRoleIds = (): number[] => {
  if (roleOptions.value.length) return selectedRoleIds.value
  return roleIdsText.value
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((id) => !Number.isNaN(id) && id > 0)
}

const saveAuths = async () => {
  if (!selectedMount.value?.docTypeCode) {
    ElMessage.warning('请先选择挂载行')
    return
  }
  authSaving.value = true
  try {
    await replaceDocTypeAuths(selectedMount.value.docTypeCode, parseRoleIds())
    ElMessage.success('授权已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存授权失败')
  } finally {
    authSaving.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchDocTypes(), fetchRoles(), fetchMounts()])
}

onMounted(refreshAll)

// 编辑挂载
const editVisible = ref(false)
const editSaving = ref(false)
const editForm = reactive<PrintMount>({
  id: undefined,
  docTypeCode: '',
  pageCode: '',
  pageName: '',
  enabled: 1,
})

const openEdit = (row: PrintMount) => {
  Object.assign(editForm, {
    id: row.id,
    docTypeId: row.docTypeId,
    docTypeCode: row.docTypeCode,
    pageCode: row.pageCode,
    pageName: row.pageName,
    enabled: row.enabled ?? 1,
    sort: row.sort,
  })
  editVisible.value = true
}

const confirmEdit = async () => {
  if (!editForm.pageCode || !editForm.pageName) {
    ElMessage.warning('请填写 pageCode 与业务页名称')
    return
  }
  editSaving.value = true
  try {
    await submitMount({ ...editForm })
    ElMessage.success('保存成功')
    editVisible.value = false
    await fetchMounts()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    editSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
.print-report-mounts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%);
}

.prm-table {
  flex: 1;
  min-height: 240px;

  :deep(.el-table__header th) {
    background: #f8fafc !important;
  }
}

.prm-muted {
  margin-left: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.prm-auth {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-weight: 600;
  }

  &__hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: #64748b;
  }
}

.prm-warn {
  margin-top: 4px;
  font-size: 12px;
  color: #d97706;
}
</style>
