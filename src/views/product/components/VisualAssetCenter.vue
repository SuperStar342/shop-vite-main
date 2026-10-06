<template>
  <div class="vac">
    <div class="vac__intro">
      <strong>商品视觉资产中心</strong>
      <span>统一管理主图、详情、视频与 3D（映射现有字段，不另建复杂库表）</span>
    </div>

    <div class="vac-grid">
      <section class="vac-block vac-block--main">
        <header>主图 <small>blade_product.main_image</small></header>
        <el-upload
          class="main-upload"
          action="#"
          :show-file-list="false"
          :http-request="(o) => up(o, 'main')"
          accept="image/*"
          drag
        >
          <el-image
            v-if="model.mainImage"
            :src="model.mainImage"
            class="cover"
            fit="contain"
          />
          <div v-else class="placeholder">拖入主图</div>
        </el-upload>
      </section>

      <section class="vac-block">
        <header>详情 / 场景 / 材质 / 尺寸图 <small>detail_images</small></header>
        <el-upload
          v-model:file-list="fileList"
          action="#"
          list-type="picture-card"
          :http-request="(o) => up(o, 'detail')"
          :on-remove="onRemove"
          accept="image/*"
          multiple
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
        <p class="hint">建议顺序：场景图 → 材质特写 → 尺寸标注图（均写入详情图数组）</p>
      </section>

      <section class="vac-block">
        <header>宣传视频 <small>video_url</small></header>
        <div class="media-row">
          <el-input v-model="model.videoUrl" placeholder="URL" />
          <el-upload action="#" :show-file-list="false" :http-request="(o) => up(o, 'video')" accept="video/*">
            <el-button>上传</el-button>
          </el-upload>
        </div>
        <video v-if="model.videoUrl" :src="model.videoUrl" class="video" controls />
      </section>

      <section class="vac-block">
        <header>3D 模型 <small>model3d_url · glb/usdz</small></header>
        <div class="media-row">
          <el-input v-model="model.model3dUrl" placeholder="URL" />
          <el-upload action="#" :show-file-list="false" :http-request="(o) => up(o, 'model')" accept=".glb,.gltf,.usdz">
            <el-button>上传</el-button>
          </el-upload>
        </div>
        <div v-if="model.model3dUrl" class="model-chip">{{ model.model3dUrl.split('/').pop() }}</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref, watch } from 'vue'
import { uploadAttachFile } from '/@/api/resource'

const props = defineProps<{ modelValue: any }>()

const model = props.modelValue

const fileList = ref<any[]>([])
watch(
  () => props.modelValue?.detailImages,
  (imgs) => {
    fileList.value = (imgs || []).map((url: string, i: number) => ({ name: `图${i + 1}`, url, status: 'success' }))
  },
  { immediate: true, deep: true }
)

async function up(opts: any, type: string) {
  try {
    const res: any = await uploadAttachFile(opts.file)
    const link = res?.link || res?.url
    if (!link) throw new Error('无地址')
    if (type === 'main') props.modelValue.mainImage = link
    else if (type === 'detail') {
      if (!Array.isArray(props.modelValue.detailImages)) props.modelValue.detailImages = []
      props.modelValue.detailImages.push(link)
    } else if (type === 'video') props.modelValue.videoUrl = link
    else props.modelValue.model3dUrl = link
    ElMessage.success('上传成功')
    opts.onSuccess?.(res)
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败')
    opts.onError?.(e)
  }
}

function onRemove(file: any) {
  const url = file?.url || ''
  props.modelValue.detailImages = (props.modelValue.detailImages || []).filter((u: string) => u !== url)
}
</script>

<style lang="scss" scoped>
.vac__intro {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    font-size: 12px;
    color: #78716c;
  }
}

.vac-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.vac-block {
  border: 1px solid #e7e5e4;
  border-radius: 14px;
  padding: 12px;
  background: #fff;

  header {
    font-weight: 700;
    margin-bottom: 10px;

    small {
      margin-left: 6px;
      font-weight: 500;
      color: #a8a29e;
      font-size: 11px;
    }
  }
}

.cover,
.placeholder {
  width: 100%;
  border-radius: 12px;
}

.main-upload {
  width: 100%;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
    height: auto !important;
    padding: 0;
    border: 1px dashed #d6d3d1;
    border-radius: 12px;
    overflow: hidden;
    background: #fafaf9;
  }

  :deep(.el-upload-dragger:hover) {
    border-color: #0f766e;
  }
}

.cover {
  display: block;
  width: 100%;
  height: auto;
  max-height: 420px;
  background: #fafaf9;

  :deep(img) {
    width: 100%;
    height: auto;
    max-height: 420px;
    object-fit: contain;
    vertical-align: top;
  }
}

.placeholder {
  display: grid;
  place-items: center;
  min-height: 160px;
  aspect-ratio: 16 / 10;
  background: #f7f5f2;
  color: #78716c;
}

.media-row {
  display: flex;
  gap: 8px;
}

.video {
  margin-top: 10px;
  width: 100%;
  max-height: 180px;
  border-radius: 10px;
  background: #111;
}

.model-chip {
  margin-top: 10px;
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background: #ccfbf1;
  color: #0f766e;
  font-size: 12px;
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #a8a29e;
}

@media (max-width: 1100px) {
  .vac-grid {
    grid-template-columns: 1fr;
  }
}
</style>
