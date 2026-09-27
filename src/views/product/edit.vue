<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (route.query.id) {
    router.replace({ path: '/product/workbench', query: { id: String(route.query.id), ...(route.query.copy ? { copy: '1' } : {}) } })
  } else {
    router.replace({ path: '/product/index', query: { create: '1' } })
  }
})
</script>
