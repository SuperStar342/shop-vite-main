<script lang="ts">
/**
 * 兼容旧 setting 路径的自动导入：统一转发到 system 字典编辑表单
 * （否则 unplugin 会优先解析到本文件的旧 stub，导致编辑无法回显）
 */
export { default } from '/@/views/system/dictionaryManagement/vabAutoComponents/DictionaryManagementEdit.vue'
</script>
