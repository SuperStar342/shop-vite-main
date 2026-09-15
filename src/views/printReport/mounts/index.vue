<template>
  <div class="prm-page auto-height-container">
    <header class="prm-hero">
      <div>
        <h1 class="prm-hero__title">挂载配置</h1>
        <p class="prm-hero__desc">将单据类型绑定到业务页，并配置可设计模板的角色</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
    </header>

    <section class="prm-layout">
      <div class="prm-card prm-card--table">
        <div class="prm-card__head">
          <span class="prm-card__title">挂载列表</span>
          <span class="prm-card__hint">点击行可配置设计授权</span>
        </div>
        <div class="prm-table-wrap">
          <el-table
            v-loading="loading"
            class="prm-table"
            :data="mountList"
            height="100%"
            highlight-current-row
            @current-change="onMountSelect"
          >
            <el-table-column label="单据类型" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="prm-type">
                  <span class="prm-type__dot" :class="`is-${typeTone(row.docTypeCode)}`" />
                  <span class="prm-type__name">{{ docTypeName(row.docTypeCode) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="业务页标识" min-width="200" prop="pageCode" show-overflow-tooltip>
              <template #default="{ row }">
                <code class="prm-code">{{ row.pageCode }}</code>
              </template>
            </el-table-column>
            <el-table-column label="业务页名称" min-width="140" prop="pageName" show-overflow-tooltip />
            <el-table-column align="center" label="状态" min-width="90">
              <template #default="{ row }">
                <el-tag effect="light" round size="small" :type="row.enabled === 1 ? 'success' : 'info'">
                  {{ row.enabled === 1 ? '已启用' : '已停用' }}
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
        </div>
      </div>

      <aside class="prm-card prm-card--auth">
        <template v-if="selectedMount">
          <div class="prm-card__head">
            <span class="prm-card__title">设计授权</span>
            <el-button :loading="authSaving" size="small" type="primary" @click="saveAuths">保存授权</el-button>
          </div>
          <div class="prm-auth-body">
            <div class="prm-auth-target">
              <span class="prm-auth-target__label">当前单据</span>
              <strong>{{ docTypeName(selectedMount.docTypeCode) }}</strong>
              <code class="prm-code">{{ selectedMount.docTypeCode }}</code>
            </div>
            <p class="prm-auth-hint">勾选可设计该单据类型模板的角色；管理员不受此限制。</p>
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
                :value="String(r.id)"
              />
            </el-select>
            <el-input
              v-else
              v-model="roleIdsText"
              placeholder="角色 API 不可用时，输入 roleId，逗号分隔"
              :rows="3"
              type="textarea"
            />
          </div>
        </template>
        <div v-else class="prm-auth-empty">
          <el-empty description="请选择左侧挂载行以配置授权" :image-size="80" />
        </div>
      </aside>
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

const typeTone = (code: string) => {
  if (code === 'instruction') return 'green'
  if (code === 'workOrder') return 'blue'
  if (code === 'dispatch') return 'purple'
  return 'orange'
}

const flattenRoles = (nodes: any[], acc: any[] = []) => {
  for (const n of nodes || []) {
    acc.push(n)
    if (n.children?.length) flattenRoles(n.children, acc)
  }
  return acc
}

const roleOptions = ref<any[]>([])
const selectedRoleIds = ref<string[]>([])
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
    const ids = auths
      .map((a) => String(a.roleId ?? a.role_id))
      .filter((id) => id && id !== 'null' && id !== 'undefined')
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

const parseRoleIds = (): string[] => {
  if (roleOptions.value.length) return selectedRoleIds.value
  return roleIdsText.value
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter((id) => id && /^\d+$/.test(id))
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
.prm-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 16px 18px 18px;
  background: #f0f2f5;
}

.prm-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    color: #1f2937;
  }

  &__desc {
    margin: 6px 0 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.prm-layout {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
  gap: 14px;
  min-height: 0;

  @media (width <= 1100px) {
    grid-template-columns: 1fr;
  }
}

.prm-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 4%);

  &__head {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: #262626;
  }

  &__hint {
    font-size: 12px;
    color: #8c8c8c;
  }

  &--table {
    min-height: 360px;
  }

  &--auth {
    min-height: 280px;
  }
}

.prm-table-wrap {
  flex: 1;
  min-height: 240px;
  padding: 0 8px 8px;
}

.prm-table {
  :deep(.el-table__header th) {
    font-weight: 600;
    color: #595959;
    background: #fafafa !important;
  }

  :deep(.el-table__row:hover > td) {
    background: #f5f9ff !important;
  }

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(.current-row > td) {
    background: #e6f4ff !important;
  }
}

.prm-type {
  display: inline-flex;
  gap: 8px;
  align-items: center;

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.is-green {
      background: #52c41a;
    }

    &.is-blue {
      background: #409eff;
    }

    &.is-purple {
      background: #9254de;
    }

    &.is-orange {
      background: #fa8c16;
    }
  }

  &__name {
    font-weight: 560;
    color: #262626;
  }
}

.prm-code {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #595959;
  background: #f5f5f5;
  border-radius: 4px;
}

.prm-auth-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.prm-auth-target {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: linear-gradient(135deg, #f5f9ff, #fafafa);
  border-radius: 8px;

  &__label {
    font-size: 12px;
    color: #8c8c8c;
  }

  strong {
    font-size: 15px;
    color: #262626;
  }
}

.prm-auth-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #8c8c8c;
}

.prm-auth-empty {
  display: grid;
  flex: 1;
  place-items: center;
  padding: 24px;
}

.prm-warn {
  margin-top: 4px;
  font-size: 12px;
  color: #d97706;
}
</style>
