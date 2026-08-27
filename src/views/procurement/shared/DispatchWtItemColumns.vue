<template>
  <template v-if="selection">
    <el-table-column type="selection" width="42" />
  </template>
  <el-table-column v-if="visible('moNo')" label="制令号" min-width="140" prop="moNo" show-overflow-tooltip />
  <el-table-column v-if="visible('goodsCode')" label="品号" min-width="100" prop="goodsCode" show-overflow-tooltip />
  <el-table-column v-if="visible('goodsType')" label="货品类型" min-width="90" prop="goodsType" />
  <el-table-column v-if="visible('sizeDesc')" label="规格尺寸" min-width="120" prop="sizeDesc" show-overflow-tooltip />
  <el-table-column v-if="visible('unitCode')" label="标准单位" min-width="80" prop="unitCode" />
  <el-table-column v-if="visible('mrName')" label="制程名称" min-width="100" prop="mrName" show-overflow-tooltip />
  <el-table-column v-if="visible('machiningSNo')" align="center" label="加工顺序" min-width="80" prop="machiningSNo" />
  <el-table-column v-if="visible('prcCode')" label="工序代号" min-width="80" prop="prcCode" />
  <el-table-column v-if="visible('prcName')" label="工序名称" min-width="100" prop="prcName" show-overflow-tooltip />
  <el-table-column v-if="visible('woBorSno')" label="工单BOR序号" min-width="120" prop="woBorSno" />
  <el-table-column v-if="visible('machiningUp')" align="right" label="加工单价" min-width="90">
    <template #default="{ row }">{{ fmt(row.machiningUp) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('fnQty')" align="right" label="完工数量" min-width="90">
    <template #default="{ row }">{{ fmt(row.fnQty) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('wtQty')" align="right" label="派工数量" min-width="90">
    <template #default="{ row }">{{ fmt(row.wtQty) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('assignQty')" align="right" label="已分派数量" min-width="100">
    <template #default="{ row }">{{ fmt(row.assignQty) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('workGpName')" label="加工小组" min-width="110" prop="workGpName" show-overflow-tooltip />
  <el-table-column v-if="visible('pWageType')" label="计件类型" min-width="100" prop="pWageType" />
  <el-table-column v-if="visible('assignType')" label="分配方式" min-width="130" prop="assignType" show-overflow-tooltip />
  <el-table-column v-if="visible('ifReAssign')" align="center" label="是否再分配" min-width="100" prop="ifReAssign" />
  <el-table-column v-if="visible('ifLastPrc')" align="center" label="是否完工工序" min-width="110" prop="ifLastPrc" />
  <el-table-column v-if="visible('sectionDesc')" label="部位属性描述" min-width="120" prop="sectionDesc" show-overflow-tooltip />
  <el-table-column v-if="visible('machiningMultiple')" align="right" label="加工倍量" min-width="90">
    <template #default="{ row }">{{ fmt(row.machiningMultiple) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('productSizeDesc')" label="所属产品规格描述" min-width="150" prop="productSizeDesc" show-overflow-tooltip />
  <el-table-column v-if="visible('goodsName')" label="货品名称" min-width="160" prop="goodsName" show-overflow-tooltip />
  <el-table-column v-if="visible('stdAttr')" label="标准属性" min-width="110" prop="stdAttr" show-overflow-tooltip />
  <el-table-column v-if="visible('propertyCode')" label="标签属性" min-width="90" prop="propertyCode" />
  <el-table-column v-if="visible('propertyValue')" align="right" label="属性值" min-width="80">
    <template #default="{ row }">{{ fmt(row.propertyValue) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('wmCode')" label="设备代号" min-width="90" prop="wmCode" />
  <el-table-column v-if="visible('planStDate')" label="计划完工日期" min-width="120" prop="planStDate" show-overflow-tooltip />
  <el-table-column v-if="visible('planEndDate')" label="计划结束日期" min-width="120" prop="planEndDate" show-overflow-tooltip />
  <el-table-column v-if="visible('cstLotNo')" label="完成品定制案号" min-width="130" prop="cstLotNo" show-overflow-tooltip />
  <el-table-column v-if="visible('machiningDesc')" label="加工说明" min-width="120" prop="machiningDesc" show-overflow-tooltip />
  <el-table-column v-if="visible('goodsRemark')" label="成品备注" min-width="120" prop="goodsRemark" show-overflow-tooltip />
  <el-table-column v-if="visible('productReq')" label="产品加工要求" min-width="130" prop="productReq" show-overflow-tooltip />
  <el-table-column v-if="visible('oriPrcCode')" label="被替代工序代码" min-width="120" prop="oriPrcCode" />
  <el-table-column v-if="visible('oriWoBorSno')" label="被替代工序BOR序号" min-width="150" prop="oriWoBorSno" />
  <el-table-column v-if="visible('oriPrcName')" label="被替代工序名称" min-width="120" prop="oriPrcName" show-overflow-tooltip />
  <el-table-column v-if="visible('machiningAmt')" align="right" label="加工金额" min-width="90">
    <template #default="{ row }">{{ fmt(row.machiningAmt) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('dcShowSeqNo')" align="center" label="序号" min-width="70" prop="dcShowSeqNo" />
  <el-table-column v-if="visible('saleUnit')" label="销售单位" min-width="80" prop="saleUnit" />
  <el-table-column v-if="visible('auxUnit')" label="辅单位" min-width="80" prop="auxUnit" />
  <el-table-column v-if="visible('auxUnitCode')" label="辅单位代号" min-width="100" prop="auxUnitCode" />
  <el-table-column v-if="visible('closeDate')" label="结案日期" min-width="120" prop="closeDate" show-overflow-tooltip />
  <el-table-column v-if="visible('creator')" label="制单人" min-width="90" prop="creator" />
  <el-table-column v-if="visible('ifClose')" align="center" label="建单状态" min-width="90" prop="ifClose" />
  <el-table-column v-if="visible('styleCode')" label="产品款式" min-width="140" prop="styleCode" show-overflow-tooltip />
  <el-table-column v-if="visible('fabricNo')" label="金相编号" min-width="110" prop="fabricNo" show-overflow-tooltip />
  <el-table-column v-if="visible('clrName')" label="颜色" min-width="90" prop="clrName" />
  <el-table-column v-if="visible('ordNo')" label="订单号" min-width="130" prop="ordNo" show-overflow-tooltip />
  <el-table-column v-if="visible('woQty')" align="right" label="工单数量" min-width="90">
    <template #default="{ row }">{{ fmt(row.woQty) }}</template>
  </el-table-column>
  <el-table-column v-if="visible('custOrdNo')" label="客户订单号" min-width="130" prop="custOrdNo" show-overflow-tooltip />
  <el-table-column v-if="visible('sku')" label="SKU" min-width="140" prop="sku" show-overflow-tooltip />
  <el-table-column v-if="visible('woNo')" label="工单号" min-width="120" prop="woNo" show-overflow-tooltip />
  <el-table-column v-if="visible('remark')" label="备注" min-width="120" prop="remark" show-overflow-tooltip />
  <el-table-column v-if="showProgress && visible('progress')" label="完成率" min-width="100">
    <template #default="{ row }">
      <el-progress :percentage="progressOf(row)" :stroke-width="8" />
    </template>
  </el-table-column>
</template>

<script lang="ts" setup>
import { useListColumns } from '/@/hooks/useListColumns'

defineProps<{
  selection?: boolean
  showProgress?: boolean
  fmt: (v: unknown, digits?: number) => string
}>()

const { visible } = useListColumns('dispatchItem')

const progressOf = (row: any) => {
  const wt = Number(row?.wtQty) || 0
  const fn = Number(row?.fnQty) || 0
  if (wt <= 0) return fn > 0 ? 100 : 0
  return Math.min(100, Math.round((fn / wt) * 100))
}
</script>
