<template>
  <div class="vab-app-main">
    <section>
      <vab-router-view />
      <vab-footer />
    </section>
  </div>
</template>

<script lang="ts" setup>
import { useRoutesStore } from '/@/store/modules/routes'
import { handleActivePath } from '/@/utils/routes'

defineOptions({
  name: 'VabAppMain',
})

const route = useRoute()
const routesStore = useRoutesStore()
const { tab, activeMenu } = storeToRefs(routesStore)

watch(
  route,
  () => {
    // resetRouter 清空路由瞬间 matched 可能为空，直接取 [0] 会抛错导致整页白屏
    const matchedRoot = route.matched[0]
    if (!matchedRoot) return
    if (tab.value.data !== matchedRoot.name) tab.value.data = matchedRoot.name as string
    activeMenu.value.data = handleActivePath(route)
  },
  { immediate: true }
)
</script>
