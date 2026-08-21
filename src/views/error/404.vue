<template>
  <div class="error-container">
    <div class="error-content">
      <div class="pic-error">
        <vab-icon class="error-svg" icon="404" is-custom-svg />
      </div>
      <div class="bullshit">
        <div class="bullshit-oops">抱歉！</div>
        <div class="bullshit-headline">{{ headline }}</div>
        <div class="bullshit-info">{{ info }}</div>
        <el-button type="primary" @click="onAction">{{ btn }}</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoutesStore } from '/@/store/modules/routes'
import { useUserStore } from '/@/store/modules/user'

const routesStore = useRoutesStore()
const userStore = useUserStore()
const router = useRouter()
const noMenu = computed(() => routesStore.allRoutes.length > 0 && routesStore.routes.length === 0)

const headline = computed(() => (noMenu.value ? '当前角色未分配菜单' : '当前页面不存在。'))
const info = computed(() =>
  noMenu.value
    ? '请联系管理员在「角色管理 → 权限」中授权后，退出并重新登录。'
    : '请检查您输入的网址是否正确，或点击下面的按钮返回首页。'
)
const btn = computed(() => (noMenu.value ? '返回登录' : '返回首页'))

const onAction = async () => {
  if (noMenu.value) {
    await userStore.FedLogOut()
    await router.replace('/login')
    return
  }
  await router.replace('/')
}
</script>
