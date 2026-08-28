<template>
  <div v-loading="pageLoading" class="personal-center-container no-background-container auto-height-container">
    <el-row :gutter="20">
      <el-col :lg="8" :md="12" :sm="24" :xl="8" :xs="24">
        <vab-card class="auto-height-card">
          <el-scrollbar>
            <div class="user-info">
              <el-avatar :size="100" :src="displayAvatar" />
              <div class="user-info-full-name">
                {{ displayName }}
              </div>
              <div class="user-info-description">
                {{ form.account || '-' }}
              </div>
              <div class="user-info-follow">
                <el-tag v-if="form.roleName" effect="plain" round type="primary">{{ form.roleName }}</el-tag>
              </div>

              <ul class="user-info-list">
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="user-3-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">账号</span>
                    <span class="item-value">{{ form.account || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="profile-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">姓名</span>
                    <span class="item-value">{{ form.realName || form.name || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="women-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">性别</span>
                    <span class="item-value">{{ sexLabel }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="phone-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">手机</span>
                    <span class="item-value">{{ form.phone || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="mail-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">邮箱</span>
                    <span class="item-value">{{ form.email || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="community-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">部门</span>
                    <span class="item-value">{{ form.deptName || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="briefcase-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">岗位</span>
                    <span class="item-value">{{ form.postName || '-' }}</span>
                  </div>
                </li>
                <li class="info-item">
                  <div class="item-icon">
                    <vab-icon icon="shield-user-line" />
                  </div>
                  <div class="item-content">
                    <span class="item-label">角色</span>
                    <span class="item-value">{{ form.roleName || '-' }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </el-scrollbar>
        </vab-card>
      </el-col>
      <el-col :lg="16" :md="12" :sm="24" :xl="16" :xs="24">
        <vab-card class="auto-height-card">
          <el-tabs v-model="activeName">
            <el-tab-pane label="基本信息" name="first">
              <el-col :lg="14" :md="18" :sm="24" :xl="12" :xs="24">
                <el-form ref="formRef" label-position="top" :model="form" :rules="rules" @submit.prevent>
                  <el-form-item label="账号">
                    <el-input v-model="form.account" disabled />
                  </el-form-item>
                  <el-form-item label="姓名" prop="realName">
                    <el-input v-model.trim="form.realName" clearable placeholder="请输入姓名" />
                  </el-form-item>
                  <el-form-item label="昵称" prop="name">
                    <el-input v-model.trim="form.name" clearable placeholder="请输入昵称" />
                  </el-form-item>
                  <el-form-item label="性别" prop="sex">
                    <el-select v-model="form.sex" style="width: 100%">
                      <el-option label="保密" :value="0" />
                      <el-option label="男" :value="1" />
                      <el-option label="女" :value="2" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="手机" prop="phone">
                    <el-input v-model.trim="form.phone" clearable placeholder="请输入手机号" />
                  </el-form-item>
                  <el-form-item label="邮箱" prop="email">
                    <el-input v-model.trim="form.email" clearable placeholder="请输入邮箱" />
                  </el-form-item>
                  <el-form-item label="部门">
                    <el-input v-model="form.deptName" disabled />
                  </el-form-item>
                  <el-form-item label="角色">
                    <el-input v-model="form.roleName" disabled />
                  </el-form-item>
                  <el-form-item>
                    <el-button :loading="saving" native-type="submit" type="primary" @click="onSubmit">
                      保存
                    </el-button>
                    <el-button :loading="pageLoading" @click="loadProfile">刷新</el-button>
                  </el-form-item>
                </el-form>
              </el-col>
            </el-tab-pane>
            <el-tab-pane label="账号安全" name="second">
              <el-alert
                :closable="false"
                show-icon
                title="账号、部门、角色由管理员分配，如需调整请联系管理员。"
                type="info"
              />
              <div class="security-list">
                <div class="item">
                  <vab-icon icon="lock-password-line" />
                  <div class="item-content">
                    <div>登录账号</div>
                    <div class="item-content-second">{{ form.account || '-' }}</div>
                  </div>
                </div>
                <vab-divider />
                <div class="item">
                  <vab-icon icon="smartphone-line" />
                  <div class="item-content">
                    <div>绑定手机</div>
                    <div class="item-content-second">{{ form.phone || '未绑定' }}</div>
                  </div>
                </div>
                <vab-divider />
                <div class="item">
                  <vab-icon icon="mail-check-line" />
                  <div class="item-content">
                    <div>绑定邮箱</div>
                    <div class="item-content-second">{{ form.email || '未绑定' }}</div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </vab-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { getUserInfo, updateUserInfo } from '/@/api/user'
import { useUserStore } from '/@/store/modules/user'
import { unwrap } from '/@/utils/bladeAdapter'
import { toOssPreviewUrl } from '/@/utils/ossUrl'

defineOptions({
  name: 'PersonalCenter',
})

const userStore = useUserStore()
const { avatar, username, userInfo } = storeToRefs(userStore)

const activeName = ref('first')
const pageLoading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<any>({
  id: '',
  account: '',
  realName: '',
  name: '',
  sex: 0,
  phone: '',
  email: '',
  deptName: '',
  postName: '',
  roleName: '',
  avatar: '',
})

const rules = reactive<FormRules>({
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
})

const displayName = computed(
  () => form.realName || form.name || form.account || username.value || '未命名用户'
)

const displayAvatar = computed(() => {
  const src = form.avatar || avatar.value
  return toOssPreviewUrl(src) || src || './static/svg/avatar.svg'
})

const sexLabel = computed(() => {
  const map: Record<number, string> = { 0: '保密', 1: '男', 2: '女' }
  return map[Number(form.sex)] ?? form.sexName ?? '保密'
})

const fillForm = (info: Record<string, any>) => {
  form.id = info.id || info.userId || info.user_id || ''
  form.account = info.account || info.user_name || info.userName || ''
  form.realName = info.realName || info.real_name || info.name || ''
  form.name = info.name || info.nick_name || info.realName || ''
  form.sex = info.sex === undefined || info.sex === null || info.sex === '' ? 0 : Number(info.sex)
  form.phone = info.phone || ''
  form.email = info.email || ''
  form.deptName = info.deptName || info.dept_name || ''
  form.postName = info.postName || info.post_name || ''
  form.roleName = info.roleName || info.role_name || ''
  form.avatar = info.avatar || ''
  form.sexName = info.sexName || ''
}

const loadProfile = async () => {
  pageLoading.value = true
  try {
    // 先用 store 里已有资料快速回填
    if (userInfo.value && typeof userInfo.value === 'object' && !Array.isArray(userInfo.value) && Object.keys(userInfo.value).length) {
      fillForm(userInfo.value as Record<string, any>)
    }
    const res: any = await getUserInfo()
    const info = (unwrap(res) || {}) as Record<string, any>
    fillForm(info)
    userStore.setUserInfo(info)
    if (info.avatar) userStore.setAvatar(info.avatar)
    const display = info.realName || info.name || info.account
    if (display) userStore.setUsername(display)
  } catch (e: any) {
    $baseMessage(e?.message || e?.msg || '加载个人信息失败', 'error', 'hey')
  } finally {
    pageLoading.value = false
  }
}

const onSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (!form.id) {
      $baseMessage('用户信息未加载完整，请刷新后重试', 'warning', 'hey')
      return
    }
    saving.value = true
    try {
      await updateUserInfo({
        id: form.id,
        name: form.name,
        realName: form.realName,
        phone: form.phone,
        email: form.email,
        sex: form.sex,
        avatar: form.avatar,
      })
      $baseMessage('保存成功', 'success', 'hey')
      await loadProfile()
    } catch (e: any) {
      $baseMessage(e?.message || e?.msg || '保存失败', 'error', 'hey')
    } finally {
      saving.value = false
    }
  })
}

onMounted(() => {
  loadProfile()
})

onActivated(() => {
  if (!form.id) loadProfile()
})
</script>

<style lang="scss" scoped>
.personal-center-container {
  .user-info {
    padding: var(--el-padding);
    text-align: center;

    :deep() {
      .el-avatar {
        img {
          padding: var(--el-padding);
          cursor: pointer;
        }
      }
    }

    &-full-name {
      margin-top: 15px;
      font-size: 24px;
      font-weight: 500;
      color: var(--el-color-grey);
    }

    &-description {
      margin-top: 8px;
      color: var(--el-text-color-secondary);
    }

    &-follow {
      margin-top: 15px;
    }

    &-list {
      margin-top: 25px;
      padding: 0 10px;
      text-align: left;
      list-style: none;

      .info-item {
        display: flex;
        align-items: flex-start;
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);

        .item-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-2) 100%);
          border-radius: 8px;
          color: #fff;
          font-size: 18px;
          margin-right: 12px;
        }

        .item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .item-label {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }

          .item-value {
            font-size: 14px;
            color: var(--el-text-color-primary);
            word-break: break-all;
          }
        }
      }
    }
  }

  .security-list {
    margin-top: 20px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 12px;

    i,
    .vab-icon {
      font-size: 32px;
      color: var(--el-color-primary);
    }

    &-content {
      box-sizing: border-box;
      flex: 1;

      &-second {
        margin-top: 8px;
        color: var(--el-text-color-secondary);
      }
    }
  }
}
</style>
