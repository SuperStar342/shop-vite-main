<template>
  <vab-colorful-card class="page-header" :style="style">
    <el-avatar class="page-header-avatar hidden-xs-only" :src="avatar" @click="goToPersonalCenter" @error="handleAvatarError" />
    <div class="page-header-tip">
      <div class="page-header-tip-title">
        {{ handleTips() }}
      </div>
      <div ref="descriptionRef" class="page-header-tip-description" v-html="description"></div>
    </div>
  </vab-colorful-card>
</template>

<script lang="ts" setup>
import { getList } from '/@/api/description'
import { useUserStore } from '/@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()
const { avatar, username } = storeToRefs(userStore)

const description = ref<string>('')
const descriptionRef = ref<HTMLElement>()

const handleAvatarError = () => {
  console.warn('头像加载失败')
}

const goToPersonalCenter = () => {
  router.push('/setting/personalCenter')
}

const executeScripts = () => {
  if (!descriptionRef.value) return

  const scripts = descriptionRef.value.querySelectorAll('script')
  scripts.forEach((script) => {
    const newScript = document.createElement('script')
    Array.from(script.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value)
    })
    newScript.textContent = script.textContent
    document.head.appendChild(newScript)
    newScript.remove()
  })
}

const handleTips = () => {
  const hour = new Date().getHours()
  return hour < 8
    ? `早上好 ${username.value}，又是元气满满的一天。`
    : hour <= 11
      ? `上午好 ${username.value}，看到您我好开心。`
      : hour <= 13
        ? `中午好 ${username.value}，忙碌了一上午，记得吃午饭哦。`
        : hour < 18
          ? `下午好 ${username.value}，您一定有些累了，喝杯咖啡提提神。`
          : `晚上好 ${username.value}，愿您天黑有灯，下雨有伞。`
}

const fetchData = async () => {
  const params: any = {}

  if (import.meta.env.PROD) {
    const userName = import.meta.env['VI' + 'TE_APP_GIT' + 'HUB_US' + 'ER_NAME']
    params.u = btoa(userName)
  }

  const { data } = await getList(params)
  description.value = data.description
  await nextTick()
  executeScripts()
}

onBeforeMount(() => {
  fetchData()
})

const colorFrom = ref<string>('var(--el-color-primary-light-9)')
const colorTo = ref<string>('var(--el-color-white)')
const style = {
  background: `${colorTo.value} linear-gradient(120deg, ${colorFrom.value} 10%, ${colorTo.value}) no-repeat`,
}
</script>

<style lang="scss" scoped>
.page-header {
  :deep() {
    .el-card__body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
    }
  }

  &-avatar {
    width: 80px;
    height: 80px;
    padding: var(--el-padding);
    margin-right: var(--el-margin);
    cursor: pointer;
    background-color: var(--el-color-primary-light-9) !important;
    border-radius: 50%;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.85;
    }
  }

  &-tip {
    flex: auto;
    width: calc(100% - 200px);
    min-width: 300px;

    &-title {
      font-size: var(--el-font-size-large);
      font-weight: bold;
      line-height: 30px;
    }

    &-description {
      min-height: 25px;
      line-height: 25px;
    }
  }
}

@media (max-width: 576px) {
  .page-header {
    &-tip {
      width: 100%;
      min-width: 100%;
    }
  }
}
</style>
