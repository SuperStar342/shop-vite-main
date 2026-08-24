<template>
  <div class="nd-page auto-height-container">
    <header v-show="wizardStep !== 2" class="nd-hero">
      <div>
        <h1>普通派工</h1>
        <p>多工单选工序；一键派工可批量设置人员配比，自动写入未派工序</p>
      </div>
      <nav class="nd-steps" aria-label="派工步骤">
        <button
          v-for="(s, idx) in stepItems"
          :key="s.key"
          class="nd-steps__item"
          :class="{ 'is-done': wizardStep > idx, 'is-current': wizardStep === idx }"
          type="button"
          @click="goStep(idx)"
        >
          <i>{{ idx + 1 }}</i>
          <span>{{ s.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Step 1: 选择工单与工序 -->
    <div v-show="wizardStep === 0" class="nd-step nd-step--pick">
      <aside class="nd-wo-pane">
        <header>
          <strong>工单列表</strong>
          <em>共 {{ filteredWorkOrders.length }} 张</em>
          <el-button :icon="Refresh" link :loading="loading" @click="loadPreview" />
        </header>
        <el-input
          v-model.trim="woKeyword"
          clearable
          placeholder="工单单号 / 品名"
          size="small"
          @keyup.enter="onWoSearchEnter"
        />
        <div v-loading="loading" class="nd-wo-list">
          <article
            v-for="(wo, idx) in filteredWorkOrders"
            :key="wo.woNo"
            class="nd-wo-card"
            :class="{
              'is-checked': selectedWoSet.has(wo.woNo),
              'is-active': activeWoNo === wo.woNo,
            }"
            :style="{ '--wo-accent': woColors[idx % woColors.length] }"
            role="button"
            tabindex="0"
            @click="onWoCardClick(wo)"
            @keydown.enter.prevent="onWoCardClick(wo)"
            @keydown.space.prevent="onWoCardClick(wo)"
          >
            <div class="nd-wo-card__accent" aria-hidden="true" />
            <div class="nd-wo-card__body">
              <div class="nd-wo-card__top">
                <b>{{ wo.woNo }}</b>
                <el-tag v-if="selectedWoSet.has(wo.woNo)" effect="plain" size="small" type="success">已选</el-tag>
              </div>
              <p>{{ wo.goodsName || '-' }}</p>
              <DispatchQtyCell
                align="left"
                :plan-qty="wo.planQty || wo.woQty"
                :remain-qty="wo.remainQty"
                :status="wo.dispatchStatus"
                :wt-qty="wo.wtQty"
              />
            </div>
            <span v-if="selectedWoSet.has(wo.woNo)" class="nd-wo-card__check" aria-hidden="true">✓</span>
          </article>
          <el-empty v-if="!filteredWorkOrders.length && !loading" description="暂无可派工单" />
        </div>
      </aside>

      <section class="nd-prc-pane">
        <header class="nd-prc-pane__head">
          <div>
            已选 <b>{{ selectedWoNos.length }}</b> 张工单
            <b>{{ selectedLines.length }}</b> 个工序
            共 <b>{{ selectedTaskCount }}</b> 个派工任务
          </div>
          <el-checkbox v-model="mergeSameProcess">
            同工序合并派工
            <el-tooltip content="勾选后按工序汇总分配，无法按每张工单单独指定数量；精细派工请取消勾选" placement="top">
              <el-icon class="nd-merge-tip"><QuestionFilled /></el-icon>
            </el-tooltip>
          </el-checkbox>
        </header>

        <el-tabs v-model="pickTab">
          <el-tab-pane label="当前工单" name="current" />
          <el-tab-pane label="批量工序" name="batch" />
          <el-tab-pane :label="`已选任务 (${selectedTaskCount})`" name="picked" />
        </el-tabs>

        <div v-loading="prcLoading" class="nd-prc-pane__body">
          <template v-if="pickTab === 'current'">
            <el-table
              ref="currentTableRef"
              :key="activeWoNo"
              :data="activeWoLines"
              border
              height="100%"
              row-key="__key"
              @selection-change="onCurrentLineSelection"
            >
              <el-table-column type="selection" width="46" :selectable="(row: any) => num(row.remainQty) > 0" />
              <el-table-column label="工序编号/名称" min-width="160">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtMachiningTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="加工次数" width="80" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningTimes) }}</template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.woQty"
                    :remain-qty="row.remainQty"
                    :wt-qty="row.wtQty"
                  />
                </template>
              </el-table-column>
            </el-table>
          </template>

          <template v-else-if="pickTab === 'batch'">
            <div class="nd-batch-bar">
              <span class="nd-batch-bar__tip">
                已勾选 {{ batchCheckedCount }} / {{ batchSelectableCount }} 道工序
              </span>
              <div class="nd-batch-bar__actions">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :disabled="!batchSelectableCount"
                  @click="selectAllBatchProcesses"
                >
                  全选
                </el-button>
                <el-button
                  size="small"
                  plain
                  :disabled="!batchCheckedCount"
                  @click="clearBatchProcesses"
                >
                  取消全选
                </el-button>
              </div>
            </div>
            <el-table
              :data="batchProcessGroups"
              border
              height="100%"
              row-key="key"
              :row-class-name="batchProcessRowClass"
              @expand-change="() => {}"
            >
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="nd-expand" :class="{ 'is-multi': row.lines.length > 1 }">
                    <div
                      v-for="line in row.lines"
                      :key="lineKey(line)"
                      class="nd-expand__row"
                    >
                      <el-checkbox
                        :model-value="checkedLeafIds.includes(lineKey(line))"
                        @change="(v: any) => setLineChecked(line, !!v)"
                      >
                        {{ line.woNo }}
                      </el-checkbox>
                      <DispatchQtyCell
                        align="left"
                        size="sm"
                        :plan-qty="line.woQty"
                        :remain-qty="line.remainQty"
                        :wt-qty="line.wtQty"
                      />
                      <span class="nd-expand__meta">
                        {{ wageTypeLabel(line.pWageType) }}
                        · 单价 {{ fmtNum(line.machiningUp) }}
                        · 工时 {{ fmtMachiningTime(line.machiningTime, line.timeUnit) }}
                        · 次数 {{ fmtNum(line.machiningTimes) }}
                      </span>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column width="52">
                <template #default="{ row }">
                  <el-checkbox
                    :indeterminate="row.coverCount > 0 && row.coverCount < row.lines.length"
                    :model-value="row.coverCount === row.lines.length && row.lines.length > 0"
                    @change="(v: any) => toggleGroup(row, !!v)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="工序编号/名称" min-width="200">
                <template #default="{ row }">
                  <div class="nd-batch-prc">
                    <div class="nd-batch-prc__name">
                      <span>{{ row.prcCode }} {{ row.prcName }}</span>
                      <el-tag
                        class="nd-scope-tag"
                        effect="plain"
                        size="small"
                        :type="row.lines.length > 1 ? 'warning' : 'info'"
                      >
                        {{ row.lines.length > 1 ? `多工单 · ${row.lines.length}` : '单工单' }}
                      </el-tag>
                    </div>
                    <el-tag
                      class="nd-cover-tag"
                      effect="plain"
                      size="small"
                      :type="row.coverCount === selectedWoNos.length ? 'success' : row.coverCount > 0 ? 'warning' : 'danger'"
                    >
                      已勾选 {{ row.coverCount }}/{{ selectedWoNos.length || 0 }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="工序类型" min-width="110" prop="mrName" show-overflow-tooltip />
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ row.wageTypeText }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="110" align="right">
                <template #default="{ row }">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed" class="nd-mixed">各工单不同</small>
                </template>
              </el-table-column>
              <el-table-column label="加工工时" width="110" align="right">
                <template #default="{ row }">{{ row.timeText }}</template>
              </el-table-column>
              <el-table-column label="工单范围" width="110" align="center">
                <template #default="{ row }">
                  <span class="nd-wo-scope" :class="row.lines.length > 1 ? 'is-multi' : 'is-single'">
                    {{ row.lines.length > 1 ? `${row.lines.length} 张工单` : '1 张工单' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.planSum"
                    :remain-qty="row.remainSum"
                    :status="groupDispatchStatus(row.lines)"
                    :wt-qty="row.wtSum"
                  />
                </template>
              </el-table-column>
            </el-table>
            <div class="nd-legend">
              <span><i class="is-none" />未派工</span>
              <span><i class="is-partial" />部分派工</span>
              <span><i class="is-done" />已派工</span>
              <span><i class="is-single" />单工单工序</span>
              <span><i class="is-multi" />多工单工序</span>
              <span><i class="is-all" />所有已选工单都包含此工序</span>
              <span><i class="is-part" />部分工单包含此工序</span>
            </div>
          </template>

          <template v-else>
            <el-table :data="selectedLines" border height="100%">
              <el-table-column label="工单" width="130" prop="woNo" />
              <el-table-column label="工序" min-width="150">
                <template #default="{ row }">{{ row.prcCode }} {{ row.prcName }}</template>
              </el-table-column>
              <el-table-column label="计薪" width="72" align="center">
                <template #default="{ row }">{{ wageTypeLabel(row.pWageType) }}</template>
              </el-table-column>
              <el-table-column label="加工单价" width="96" align="right">
                <template #default="{ row }">{{ fmtNum(row.machiningUp) }}</template>
              </el-table-column>
              <el-table-column label="加工工时" width="100" align="right">
                <template #default="{ row }">{{ fmtMachiningTime(row.machiningTime, row.timeUnit) }}</template>
              </el-table-column>
              <el-table-column label="派工状态/数量" width="148" align="right">
                <template #default="{ row }">
                  <DispatchQtyCell
                    :plan-qty="row.woQty"
                    :remain-qty="row.remainQty"
                    :wt-qty="row.wtQty"
                  />
                </template>
              </el-table-column>
              <el-table-column label="预估工费" width="100" align="right">
                <template #default="{ row }">{{ fmtNum(estimateBorWage(row)) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button link type="danger" @click="setLineChecked(row, false)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>

        <footer class="nd-prc-pane__foot">
          <span>已选 {{ selectedWoNos.length }} 张工单 · {{ selectedLines.length }} 道工序</span>
          <div>
            <el-button @click="clearSelection">清空</el-button>
            <el-button type="success" plain :loading="smartLoading" :disabled="!selectedWoNos.length" @click="openSmartDialog">
              智能派工
            </el-button>
            <el-button type="primary" :disabled="!selectedLines.length" @click="wizardStep = 1">
              下一步：选择人员
            </el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 2: 指派人员与数量 -->
    <div v-show="wizardStep === 1" class="nd-step nd-step--assign">
      <aside class="nd-side-summary">
        <header>已选工单</header>
        <ul>
          <li v-for="(woNo, i) in selectedWoNos" :key="woNo" :style="{ '--c': woColors[i % woColors.length] }">
            <i />{{ woNo }}
          </li>
        </ul>
        <dl>
          <div><dt>工单</dt><dd>{{ selectedWoNos.length }}</dd></div>
          <div><dt>工序</dt><dd>{{ selectedLines.length }}</dd></div>
          <div><dt>总量</dt><dd>{{ fmtNum(totalRemainQty) }}</dd></div>
          <div><dt>预估工费</dt><dd>{{ fmtNum(estimatedWageTotal) }}</dd></div>
        </dl>
      </aside>

      <section class="nd-assign-pane">
        <header class="nd-assign-pane__head">
          <div class="nd-assign-pane__head-left">
            <el-radio-group v-model="assignView" size="small">
              <el-radio-button value="wo">按工单查看</el-radio-button>
              <el-radio-button value="process">按工序汇总查看</el-radio-button>
            </el-radio-group>
            <span class="nd-hint">比例与数量联动：改比例自动算数量，改数量自动回写比例</span>
          </div>
          <div v-if="mergeSameProcess" class="nd-mode-alert">
            <el-alert
              show-icon
              :closable="false"
              title="当前为合并模式：无法按每张工单单独指定数量。精细派工请返回上一步取消「同工序合并派工」。"
              type="warning"
            />
          </div>
          <div v-else-if="assignView !== 'process'" class="nd-mode-alert">
            <el-alert
              show-icon
              :closable="false"
              title="精细派工请使用「按工序汇总查看」：工序下会展示各工单，可分别选人、填数量。"
              type="info"
            />
          </div>
          <div class="nd-assign-pane__head-right">
            <span class="nd-hint">
              {{
                mergeSameProcess
                  ? '同工序合并：按工费份额拆到各工单（单价不同更公平）'
                  : '按工序查看：工序下展示各工单，每张工单独立选人、填数量'
              }}
            </span>
            <el-button size="small" type="success" plain :loading="smartLoading" @click="openSmartDialog">
              智能派工
            </el-button>
            <el-button size="small" type="success" plain :disabled="!selectedLines.length" @click="openOneClickDispatch">
              一键派工
            </el-button>
            <el-button size="small" type="primary" plain @click="applyEqualAll">全部平均</el-button>
          </div>
        </header>

        <el-table
          :data="assignTableData"
          border
          height="100%"
          row-key="rowKey"
          :row-class-name="assignRowClassName"
          :span-method="assignSpanMethod"
        >
          <el-table-column label="工单 / 工序" min-width="180">
            <template #default="{ row }">
              <template v-if="row.kind === 'wo-head'">
                <div class="nd-wo-head-row">
                  <b class="nd-wo-head">{{ row.woNo }}</b>
                  <DispatchQtyCell
                    align="left"
                    mode="alloc"
                    size="sm"
                    :assigned-qty="row.assignedQty"
                    :remain-qty="row.remainQty"
                  />
                </div>
              </template>
              <template v-else-if="row.kind === 'process-head'">
                <div class="nd-prc-cell nd-prc-cell--head">
                  <div class="nd-prc-cell__title">
                    <span>{{ row.prcCode }} {{ row.prcName }}</span>
                    <el-tag class="nd-scope-tag" effect="plain" size="small" type="warning">
                      多工单 · {{ row.woCount }}
                    </el-tag>
                  </div>
                  <small>{{ row.mrName || '' }} · 含 {{ row.woCount }} 张工单，可统一选人或分单配置</small>
                </div>
              </template>
              <template v-else-if="row.kind === 'line-sub'">
                <div class="nd-wo-under-prc">
                  <el-tag effect="plain" size="small" type="info">{{ row.woText }}</el-tag>
                  <small>单工单工序</small>
                </div>
              </template>
              <template v-else>
                <div class="nd-prc-cell">
                  <div class="nd-prc-cell__title">
                    <span>{{ row.prcCode }} {{ row.prcName }}</span>
                    <el-tag
                      v-if="row.lines?.length > 1"
                      class="nd-scope-tag"
                      effect="plain"
                      size="small"
                      type="warning"
                    >
                      多工单 · {{ row.lines.length }}
                    </el-tag>
                    <el-tag v-else class="nd-scope-tag" effect="plain" size="small" type="info">单工单</el-tag>
                  </div>
                  <small v-if="row.woText">{{ row.woText }}</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="工序类型" min-width="100" prop="mrName" show-overflow-tooltip />
          <el-table-column label="计薪" width="72" align="center">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.wageTypeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="加工单价" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <div class="nd-up-cell">
                  <span>{{ row.upText }}</span>
                  <small v-if="row.upMixed">各工单单价不同，按工费份额拆量</small>
                </div>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="加工工时" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">{{ row.timeText }}</template>
            </template>
          </el-table-column>
          <el-table-column label="派工状态/数量" width="148" align="right">
            <template #default="{ row }">
              <DispatchQtyCell
                v-if="row.kind !== 'wo-head'"
                :plan-qty="row.planQty"
                :remain-qty="row.remainQty"
                :wt-qty="row.wtQty"
              />
            </template>
          </el-table-column>
          <el-table-column label="精细化指派（人员 / 比例 / 数量）" min-width="380">
            <template #default="{ row }">
              <div v-if="row.kind === 'process-head'" class="nd-fine nd-fine--head">
                <el-button :icon="Plus" size="small" type="primary" plain @click="openEmpForProcess(row.processKey)">
                  为各工单统一选人
                </el-button>
                <span class="nd-muted">快捷：一次选人并分别填各工单数量；也可在下方每张工单行单独配置</span>
              </div>
              <div v-else-if="row.kind !== 'wo-head'" class="nd-fine">
                <article v-for="w in row.workers" :key="w.empNo" class="nd-fine__card">
                  <div class="nd-fine__who">
                    <em>{{ (w.empName || '?').slice(0, 1) }}</em>
                    <div>
                      <strong>{{ w.empName || w.empNo }}</strong>
                      <span>{{ w.empNo }}</span>
                    </div>
                    <button
                      v-if="row.editable"
                      class="nd-fine__remove"
                      type="button"
                      title="移除"
                      @click="removeWorker(row.taskKey, w.empNo)"
                    >
                      ×
                    </button>
                  </div>
                  <div class="nd-fine__fields">
                    <label class="nd-fine__ratio">
                      比例%
                      <div class="nd-fine__ratio-row">
                        <el-slider
                          v-model="w.ratio"
                          :disabled="!row.editable"
                          :max="100"
                          :min="0"
                          :show-tooltip="true"
                          @change="onWorkerRatioChange(row.taskKey)"
                          @input="onWorkerRatioChange(row.taskKey)"
                        />
                        <b>{{ Math.round(num(w.ratio)) }}%</b>
                      </div>
                    </label>
                    <label>
                      数量
                      <el-input-number
                        v-model="w.planQty"
                        controls-position="right"
                        :disabled="!row.editable"
                        :max="num(row.remainQty)"
                        :min="0"
                        :precision="2"
                        :step="1"
                        @change="onWorkerQtyChange(row.taskKey)"
                      />
                    </label>
                    <span v-if="row.lines?.[0]" class="nd-fine__wage">
                      工费 {{ fmtNum(num(w.planQty) * num(row.lines[0].machiningUp)) }}
                    </span>
                  </div>
                </article>
                <div v-if="row.editable" class="nd-fine__actions">
                  <el-button :icon="Plus" size="small" type="primary" @click="openEmpFor(row.taskKey)">
                    {{ row.kind === 'line-sub' ? '选择人员' : '加人' }}
                  </el-button>
                  <el-button size="small" :disabled="!row.workers.length" @click="applyEqualTask(row.taskKey)">
                    本行平均
                  </el-button>
                </div>
                <span v-if="!row.workers.length && !row.editable" class="nd-muted">由汇总行分配后按未派量比例拆分</span>
                <p v-if="row.editable && row.overAssign" class="nd-fine__warn">已分 {{ fmtNum(row.assignedQty) }} 超出未派 {{ fmtNum(row.remainQty) }}</p>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="本次分配/未派" width="148" align="right">
            <template #default="{ row }">
              <div v-if="row.kind !== 'wo-head'" :class="{ 'is-bad': row.overAssign }">
                <DispatchQtyCell
                  mode="alloc"
                  :assigned-qty="row.assignedQty"
                  :remain-qty="row.remainQty"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="预估工费" width="100" align="right">
            <template #default="{ row }">
              <template v-if="row.kind !== 'wo-head'">
                <b class="is-ok">{{ fmtNum(row.estWage) }}</b>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <footer>
          <span>
            已分配任务 {{ assignedTaskCount }}/{{ assignRows.length }} · 数量
            {{ fmtNum(assignedTotalQty) }}/{{ fmtNum(totalRemainQty) }}
            · 预估工费 {{ fmtNum(estimatedWageTotal) }}
            <em v-if="hasOverAssign" class="is-bad"> · 存在超量分配</em>
          </span>
          <div>
            <el-button @click="wizardStep = 0">上一步</el-button>
            <el-button type="primary" :disabled="!canGoConfirm" @click="wizardStep = 2">确认派工</el-button>
          </div>
        </footer>
      </section>
    </div>

    <!-- Step 3: 派工预览 -->
    <div v-show="wizardStep === 2" class="nd-step nd-step--confirm">
      <section class="nd-preview">
        <header class="nd-preview__hero">
          <div class="nd-preview__hero-text">
            <h2>
              <el-icon class="nd-preview__hero-icon"><Document /></el-icon>
              派工预览
            </h2>
            <p>
              共 {{ filteredConfirmSummary.taskCount }} 个派工任务，预计完成 {{ fmtNum(filteredConfirmSummary.planQty) }} 件
            </p>
          </div>
          <div class="nd-preview__hero-actions">
            <el-button :icon="ArrowLeft" @click="wizardStep = 1">返回编辑</el-button>
          </div>
        </header>

        <div class="nd-preview__kpi">
          <article v-for="card in confirmKpiCards" :key="card.key" class="nd-preview-kpi">
            <span class="nd-preview-kpi__icon" :class="`is-${card.tone}`">
              <el-icon><component :is="card.icon" /></el-icon>
            </span>
            <div>
              <em>{{ card.label }}</em>
              <strong>{{ card.value }}</strong>
              <small v-if="card.sub">{{ card.sub }}</small>
            </div>
          </article>
        </div>

        <div class="nd-preview__panel">
          <header class="nd-preview__panel-head">
            <strong>派工任务明细</strong>
            <div class="nd-preview__panel-tools">
              <el-select v-model="confirmGroupBy" size="small" style="width: 132px">
                <el-option label="按工单" value="wo" />
                <el-option label="按工序" value="process" />
              </el-select>
              <el-popover placement="bottom-end" trigger="click" :width="340">
                <template #reference>
                  <el-button size="small" :type="confirmFilterActive ? 'primary' : 'default'" plain>
                    <el-icon><Filter /></el-icon>
                    筛选
                    <em v-if="confirmFilterActive" class="nd-preview-filter-badge">{{ confirmFilterActive }}</em>
                  </el-button>
                </template>
                <div class="nd-preview-filter">
                  <header class="nd-preview-filter__head">
                    <strong>筛选条件</strong>
                    <el-button link type="primary" :disabled="!confirmFilterActive" @click="resetConfirmFilter">
                      重置
                    </el-button>
                  </header>
                  <el-form label-width="72px" size="small">
                    <el-form-item label="关键词">
                      <el-input
                        v-model.trim="confirmFilter.keyword"
                        clearable
                        placeholder="工单 / 工序 / 品名"
                      />
                    </el-form-item>
                    <el-form-item label="工单">
                      <el-select v-model="confirmFilter.woNo" clearable filterable placeholder="全部工单">
                        <el-option v-for="wo in confirmWoOptions" :key="wo" :label="wo" :value="wo" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="工序">
                      <el-select v-model="confirmFilter.prcKey" clearable filterable placeholder="全部工序">
                        <el-option
                          v-for="opt in confirmPrcOptions"
                          :key="opt.value"
                          :label="opt.label"
                          :value="opt.value"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="人员">
                      <el-select v-model="confirmFilter.empNo" clearable filterable placeholder="全部人员">
                        <el-option
                          v-for="opt in confirmWorkerOptions"
                          :key="opt.empNo"
                          :label="opt.label"
                          :value="opt.empNo"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="派工状态">
                      <el-checkbox v-model="confirmFilter.onlyPartial">仅显示未派满</el-checkbox>
                    </el-form-item>
                  </el-form>
                  <footer class="nd-preview-filter__foot">
                    当前显示 {{ filteredConfirmItems.length }} / {{ confirmItems.length }} 条
                  </footer>
                </div>
              </el-popover>
              <el-button :icon="Download" size="small" :disabled="!filteredConfirmItems.length" @click="exportConfirmPreview">
                导出
              </el-button>
            </div>
          </header>

          <div class="nd-preview-table-wrap">
            <table class="nd-preview-table">
              <thead>
                <tr>
                  <th>工单 / 工序</th>
                  <th>工序类型</th>
                  <th>计薪方式</th>
                  <th class="is-num">加工单价</th>
                  <th class="is-num">加工工时</th>
                  <th class="is-qty">本次派工 / 可派剩余</th>
                  <th>人员分配</th>
                  <th class="is-num">预计工时</th>
                  <th class="is-num">总工价</th>
                  <th class="is-op">操作</th>
                </tr>
              </thead>
              <tbody v-if="!displayConfirmGroups.length">
                <tr>
                  <td class="nd-preview-table__empty" colspan="10">
                    <el-empty :image-size="72" description="无匹配派工任务，请调整筛选条件" />
                  </td>
                </tr>
              </tbody>
              <tbody v-for="group in displayConfirmGroups" :key="group.groupKey">
                <tr class="nd-preview-table__group">
                  <td colspan="10">
                    <div class="nd-preview-group">
                      <div class="nd-preview-group__main">
                        <b>{{ group.title }}</b>
                        <span v-if="group.subtitle">{{ group.subtitle }}</span>
                        <el-tag effect="plain" size="small" type="info">{{ group.taskCount }} 个任务</el-tag>
                      </div>
                      <div class="nd-preview-group__sub">
                        小计: {{ fmtNum(group.assignedQty) }} / {{ fmtNum(group.remainQty) }}
                        <em>{{ fmtWorkSeconds(group.estTimeSec) }}</em>
                        <strong>¥{{ fmtNum(group.estWage) }}</strong>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-for="row in group.items" :key="row.key">
                  <td>
                    <div class="nd-preview-prc">
                      <b>{{ row.prcCode }} {{ row.prcName }}</b>
                    </div>
                  </td>
                  <td>
                    <el-tag effect="plain" round size="small" type="success">{{ row.mrName || '-' }}</el-tag>
                  </td>
                  <td>{{ row.wageTypeText }}</td>
                  <td class="is-num">{{ fmtNum(row.machiningUp) }}</td>
                  <td class="is-num">{{ row.machiningTimeText }}</td>
                  <td class="is-qty">
                    <div class="nd-preview-qty">
                      <DispatchQtyCell
                        mode="alloc"
                        align="left"
                        size="sm"
                        :assigned-qty="row.assignedQty"
                        :remain-qty="row.remainQty"
                      />
                      <el-progress
                        :color="'#2e7d5a'"
                        :percentage="row.qtyPercent"
                        :show-text="false"
                        :stroke-width="12"
                      />
                    </div>
                  </td>
                  <td>
                    <div class="nd-preview-workers">
                      <span v-for="w in row.workers" :key="w.empNo" class="nd-preview-worker">
                        <el-avatar :size="30">{{ workerInitial(w.empName || w.empNo) }}</el-avatar>
                        <em>{{ w.empName || w.empNo }}</em>
                        <b>{{ fmtNum(w.planQty) }}</b>
                      </span>
                      <button class="nd-preview-worker-add" type="button" title="调整人员" @click="wizardStep = 1">
                        +
                      </button>
                    </div>
                  </td>
                  <td class="is-num is-ok">{{ row.estTimeText }}</td>
                  <td class="is-num is-wage">¥{{ fmtNum(row.estWage) }}</td>
                  <td class="is-op">
                    <el-button link type="primary" @click="wizardStep = 1">···</el-button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer class="nd-preview__foot">
          <el-button @click="wizardStep = 0">取消</el-button>
          <el-button :icon="Promotion" :loading="saving" type="primary" :disabled="!canSubmit" @click="submit">
            确认派工
          </el-button>
        </footer>
      </section>
    </div>

    <EmpPickerDialog
      v-model="empDialog"
      :alloc-lines="editingAllocLines"
      :batch-template="isOneClickMode"
      :dialog-title="empDialogTitle"
      :line-workers="editingLineWorkers"
      :preferred-dept-id="preferredDeptId"
      :selected="empDialogSelected"
      @confirm="onEmpPickerConfirm"
      @confirm-alloc="onEmpPickerConfirmAlloc"
    />

    <el-dialog v-model="smartDialog" title="智能派工" width="520px" append-to-body destroy-on-close>
      <p class="nd-smart-tip">
        按本车间近 {{ smartDays }} 天工序经验与在途负荷推荐人员；采用后按<strong>推荐得分占比</strong>分配比例（高分多派），再按工费份额拆到各工单。
      </p>
      <el-form label-width="88px">
        <el-form-item label="推荐人数">
          <el-input-number v-model="smartLimit" :max="5" :min="1" :step="1" />
        </el-form-item>
        <el-form-item label="回溯天数">
          <el-input-number v-model="smartDays" :max="90" :min="7" :step="1" />
        </el-form-item>
      </el-form>
      <ul v-if="smartPreview.length" class="nd-smart-list">
        <li v-for="(e, i) in smartPreview" :key="e.empNo">
          <b>{{ i + 1 }}. {{ e.empName || e.empNo }}</b>
          <span>{{ e.empNo }}</span>
          <em>{{ e.reason || '' }}</em>
          <small>得分 {{ e.score }} · 预计比例 {{ smartPreviewRatio(e) }}%</small>
        </li>
      </ul>
      <el-empty v-else-if="smartPreviewTried" :image-size="56" description="暂无推荐结果" />
      <template #footer>
        <el-button @click="smartDialog = false">取消</el-button>
        <el-button :loading="smartLoading" @click="previewSmartSuggest">预览推荐</el-button>
        <el-button type="primary" :loading="smartLoading" @click="applySmartDispatch">采用并分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowLeft,
  Box,
  Clock,
  Document,
  Download,
  Filter,
  Plus,
  Promotion,
  QuestionFilled,
  Refresh,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'
import {
  getQuickDispatchEmployees,
  getQuickDispatchPreview,
  getQuickDispatchProcesses,
  getQuickDispatchSmartSuggest,
  submitQuickDispatch,
} from '/@/api/procurement/quickDispatch'
import {
  applyEqualWorkers,
  fmtNum,
  num,
  redistributeWorkersByRatio,
  resolveDispatchStatus,
  splitWorkersByWage,
  syncWorkersRatioFromQty,
  type AllocWorker,
} from '/@/utils/dispatchAlloc'
import {
  borLineKey,
  estimateBorWage,
  estimateBorWorkSeconds,
  fmtMachiningTime,
  fmtWorkSeconds,
  summarizeBorWageFields,
  wageTypeLabel,
} from '/@/utils/dispatchBor'
import DispatchQtyCell from './DispatchQtyCell.vue'
import EmpPickerDialog, { type EmpAllocLine } from './EmpPickerDialog.vue'

/**
 * 普通派工三步向导：
 * 1) 勾选工单与工序  2) 指派人员/数量  3) 预览确认提交
 * 核心状态在 assignMap：taskKey → 工人配比列表。
 */
defineOptions({ name: 'NormalDispatch' })

const route = useRoute()

// ---------- 向导与筛选状态 ----------
const stepItems = [
  { key: 'pick', label: '选择工单与工序' },
  { key: 'assign', label: '指派人员与数量' },
  { key: 'confirm', label: '确认派工' },
]

const woColors = ['#3b82f6', '#2e7d5a', '#ea580c', '#7c3aed', '#0891b2']

const wizardStep = ref(0)
/** 预览页分组：按工单 / 按工序 */
const confirmGroupBy = ref<'wo' | 'process'>('wo')
/** 预览页筛选条件（与顶部 KPI 同步） */
const confirmFilter = reactive({
  keyword: '',
  woNo: '',
  prcKey: '',
  empNo: '',
  onlyPartial: false,
})
const loading = ref(false)
const prcLoading = ref(false)
const saving = ref(false)
const smartLoading = ref(false)
const smartDialog = ref(false)
const smartLimit = ref(2)
const smartDays = ref(30)
const smartPreview = ref<any[]>([])
const smartPreviewTried = ref(false)
/** true=同工序合并为一行分配；false=每张工单工序独立分配（精细派工） */
const mergeSameProcess = ref(false)
const pickTab = ref<'current' | 'batch' | 'picked'>('batch')
const assignView = ref<'wo' | 'process'>('process')
/** 防止比例↔数量联动时互相触发 */
const allocSyncing = ref(false)
const woKeyword = ref('')
const queryWoNo = ref('')
const queryMoNo = ref('')
const activeWoNo = ref('')
const allWorkOrders = ref<any[]>([])
/** 工单号 → 工序行缓存（按需加载） */
const linesByWo = ref<Record<string, any[]>>({})
const selectedWoSet = ref<Set<string>>(new Set())
/** 已勾选工序行的 lineKey 列表 */
const checkedLeafIds = ref<string[]>([])

/**
 * 一键派工专用标记：
 * - editingTaskKey === ONE_CLICK_MODE 时弹窗进入「配比模板」模式
 * - allocLines 使用 ONE_CLICK_TEMPLATE_KEY，确认后按模板写入未派工序
 */
const ONE_CLICK_MODE = '__oneclick__'
const ONE_CLICK_TEMPLATE_KEY = '__oneclick_template__'

/** taskKey → workers；合并时为工序键(processKey)，非合并为行键(lineKey) */
const assignMap = ref<Record<string, AllocWorker[]>>({})
/** 一键派工上次配比模板（再次打开弹窗时回显） */
const oneClickTemplateWorkers = ref<AllocWorker[]>([])
const empDialog = ref(false)
/** 当前编辑的任务键；一键派工时为 ONE_CLICK_MODE */
const editingTaskKey = ref('')
/** 传给选人弹窗的分配行；有值则进入 alloc 模式 */
const editingAllocLines = ref<EmpAllocLine[]>([])
const currentTableRef = ref<any>(null)
const syncingCurrentTable = ref(false)

/** 工序行唯一键（与后端 lineMatchKey 一致） */
const lineKey = borLineKey
/** 同工艺同工序合并键（忽略工单） */
const processKey = (row: any) => `${row.mrCode || ''}|${row.prcCode || ''}`
/** 当前模式下写入 assignMap 使用的键 */
const taskKeyOf = (line: any) => (mergeSameProcess.value ? processKey(line) : lineKey(line))

const summarizeWageFields = summarizeBorWageFields

// ---------- Step1：工单 / 工序选择 ----------
const selectedWoNos = computed(() => [...selectedWoSet.value])

const filteredWorkOrders = computed(() => {
  const kw = woKeyword.value.trim().toLowerCase()
  return allWorkOrders.value.filter((wo) => {
    if (!kw) return true
    return `${wo.woNo || ''}${wo.goodsName || ''}${wo.moNo || ''}`.toLowerCase().includes(kw)
  })
})

const activeWoLines = computed(() => {
  const woNo = activeWoNo.value || selectedWoNos.value[0]
  if (!woNo) return []
  return (linesByWo.value[woNo] || [])
    .filter((l) => num(l.remainQty) > 0)
    .map((l) => ({ ...l, __key: lineKey(l) }))
})

/** 当前已勾选且仍有未派量的工序行（后续分配 / 提交的数据源） */
const selectedLines = computed(() => {
  const map = new Map<string, any>()
  for (const lines of Object.values(linesByWo.value)) {
    for (const line of lines || []) {
      if (num(line.remainQty) <= 0) continue
      map.set(lineKey(line), line)
    }
  }
  return checkedLeafIds.value.map((id) => map.get(id)).filter(Boolean)
})

const selectedTaskCount = computed(() => {
  if (!mergeSameProcess.value) return selectedLines.value.length
  return new Set(selectedLines.value.map(processKey)).size
})

const totalRemainQty = computed(() => selectedLines.value.reduce((s, l) => s + num(l.remainQty), 0))

const preferredDeptId = computed(() => {
  const woNo = selectedLines.value[0]?.woNo || selectedWoNos.value[0]
  return allWorkOrders.value.find((w) => w.woNo === woNo)?.deptId
})

/** 批量工序分组（来自已选工单的全部待派工序） */
const batchProcessGroups = computed(() => {
  const groups = new Map<string, any>()
  for (const woNo of selectedWoNos.value) {
    for (const line of linesByWo.value[woNo] || []) {
      if (num(line.remainQty) <= 0) continue
      const key = processKey(line)
      const g = groups.get(key) || {
        key,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        mrName: line.mrName,
        prcName: line.prcName,
        lines: [] as any[],
        remainSum: 0,
        planSum: 0,
        wtSum: 0,
        coverCount: 0,
      }
      g.lines.push(line)
      g.remainSum += num(line.remainQty)
      g.planSum += num(line.woQty)
      g.wtSum += num(line.wtQty)
      groups.set(key, g)
    }
  }
  for (const g of groups.values()) {
    g.coverCount = g.lines.filter((l: any) => checkedLeafIds.value.includes(lineKey(l))).length
    Object.assign(g, summarizeWageFields(g.lines))
  }
  return [...groups.values()].sort((a, b) => String(a.prcCode).localeCompare(String(b.prcCode)))
})

/** 批量工序可选行数（已选工单下全部待派工序） */
const batchSelectableIds = computed(() => {
  const ids: string[] = []
  for (const g of batchProcessGroups.value) {
    for (const line of g.lines || []) ids.push(lineKey(line))
  }
  return ids
})

const batchSelectableCount = computed(() => batchSelectableIds.value.length)

const batchCheckedCount = computed(() => {
  const set = new Set(batchSelectableIds.value)
  return checkedLeafIds.value.filter((id) => set.has(id)).length
})

/** 批量工序：全选当前列表全部待派工序 */
const selectAllBatchProcesses = () => {
  if (!batchSelectableIds.value.length) {
    $baseMessage('暂无可选工序，请先勾选工单', 'warning', 'hey')
    return
  }
  const set = new Set(checkedLeafIds.value)
  for (const id of batchSelectableIds.value) set.add(id)
  checkedLeafIds.value = [...set]
}

/** 批量工序：取消勾选当前列表工序（不影响其他来源勾选） */
const clearBatchProcesses = () => {
  const drop = new Set(batchSelectableIds.value)
  checkedLeafIds.value = checkedLeafIds.value.filter((id) => !drop.has(id))
}

/** 批量工序组：汇总多工单的 ERP 派工状态 */
const groupDispatchStatus = (lines: any[]) => {
  if (!lines?.length) return '未派工'
  const statuses = lines.map((l) => resolveDispatchStatus(l.remainQty, l.woQty, l.wtQty))
  if (statuses.every((s) => s === '已派工')) return '已派工'
  if (statuses.every((s) => s === '未派工')) return '未派工'
  return '部分派工'
}

// ---------- Step2：分配任务行（合并 / 逐行） ----------
/** 可编辑任务行：mergeSameProcess 时按工序汇总，否则一工单一行 */
const assignRows = computed(() => {
  if (mergeSameProcess.value) {
    const grouped = new Map<string, any[]>()
    for (const line of selectedLines.value) {
      const key = processKey(line)
      const list = grouped.get(key) || []
      list.push(line)
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([key, lines]) => {
      const sample = lines[0]
      const remainQty = lines.reduce((s, l) => s + num(l.remainQty), 0)
      const planQty = lines.reduce((s, l) => s + num(l.woQty), 0)
      const workers = assignMap.value[key] || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      const wage = summarizeWageFields(lines)
      const split = splitWorkersByWage(workers, lines)
      const qtyMap = new Map(split.map(({ line, workers: ws }) => [lineKey(line), ws.reduce((s, w) => s + num(w.planQty), 0)]))
      const estWage = assignedQty > 0 ? wage.estWageByQty(qtyMap, assignedQty) : wage.estWageByQty(null, remainQty)
      return {
        kind: 'task',
        rowKey: key,
        taskKey: key,
        editable: true,
        prcCode: sample.prcCode,
        prcName: sample.prcName,
        mrName: sample.mrName,
        woText: `关联 ${[...new Set(lines.map((l) => l.woNo))].join('、')}`,
        remainQty,
        planQty,
        wtQty: lines.reduce((s, l) => s + num(l.wtQty), 0),
        assignedQty,
        overAssign: assignedQty - remainQty > 0.000001,
        workers,
        lines,
        ...wage,
        estWage,
      }
    })
  }
  return selectedLines.value.map((line) => {
    const key = lineKey(line)
    const workers = assignMap.value[key] || []
    const remainQty = num(line.remainQty)
    const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
    const wage = summarizeWageFields([line])
    const qty = assignedQty > 0 ? assignedQty : remainQty
    return {
      kind: 'task',
      rowKey: key,
      taskKey: key,
      editable: true,
      prcCode: line.prcCode,
      prcName: line.prcName,
      mrName: line.mrName,
      woText: line.woNo,
      remainQty,
      planQty: num(line.woQty),
      wtQty: num(line.wtQty),
      assignedQty,
      overAssign: assignedQty - remainQty > 0.000001,
      workers,
      lines: [line],
      ...wage,
      estWage: estimateBorWage(line, qty),
    }
  })
})

/**
 * 将合并任务上的工人份额按工费拆回各工单工序行。
 * 提交与预览都以「单工序行」为准，故合并模式下必须先拆分。
 */
const lineSplitMap = computed(() => {
  const map = new Map<string, AllocWorker[]>()
  for (const row of assignRows.value) {
    const splits = splitWorkersByWage(row.workers, row.lines)
    for (const { line, workers } of splits) {
      map.set(lineKey(line), workers)
    }
  }
  return map
})

const assignTableRows = computed(() => {
  if (assignView.value === 'process' || !mergeSameProcess.value) {
    return assignRows.value
  }
  // 按工单查看：展示拆分后的人员（只读），编辑仍在汇总
  const rows: any[] = []
  const byWo = new Map<string, any[]>()
  for (const line of selectedLines.value) {
    const list = byWo.get(line.woNo) || []
    list.push(line)
    byWo.set(line.woNo, list)
  }
  for (const [woNo, lines] of byWo) {
    let remain = 0
    let assigned = 0
    const children = lines.map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      remain += num(line.remainQty)
      assigned += assignedQty
      const wage = summarizeWageFields([line])
      const qty = assignedQty > 0 ? assignedQty : num(line.remainQty)
      return {
        kind: 'line',
        rowKey: lineKey(line),
        taskKey: taskKeyOf(line),
        editable: !mergeSameProcess.value,
        woNo,
        prcCode: line.prcCode,
        prcName: line.prcName,
        mrName: line.mrName,
        remainQty: num(line.remainQty),
        planQty: num(line.woQty),
        wtQty: num(line.wtQty),
        assignedQty,
        overAssign: assignedQty - num(line.remainQty) > 0.000001,
        workers,
        lines: [line],
        ...wage,
        estWage: estimateBorWage(line, qty),
      }
    })
    rows.push({
      kind: 'wo-head',
      rowKey: `wo:${woNo}`,
      woNo,
      remainQty: remain,
      assignedQty: assigned,
    })
    rows.push(...children)
  }
  return rows
})

/** 不合并 + 按工序查看：同工多工单折叠为工序头 + 工单子行 */
const assignDisplayRows = computed(() => {
  const rows = assignRows.value
  const byProcess = new Map<string, any[]>()
  for (const row of rows) {
    const pk = processKey(row.lines[0])
    const list = byProcess.get(pk) || []
    list.push(row)
    byProcess.set(pk, list)
  }
  const out: any[] = []
  const entries = [...byProcess.entries()].sort((a, b) =>
    String(a[1][0]?.prcCode || '').localeCompare(String(b[1][0]?.prcCode || ''))
  )
  for (const [pk, groupRows] of entries) {
    if (groupRows.length > 1) {
      const sample = groupRows[0]
      const wage = summarizeWageFields(groupRows.flatMap((r) => r.lines))
      out.push({
        kind: 'process-head',
        rowKey: `proc:${pk}`,
        processKey: pk,
        prcCode: sample.prcCode,
        prcName: sample.prcName,
        mrName: sample.mrName,
        woCount: groupRows.length,
        planQty: groupRows.reduce((s, r) => s + num(r.planQty), 0),
        wtQty: groupRows.reduce((s, r) => s + num(r.wtQty), 0),
        remainQty: groupRows.reduce((s, r) => s + num(r.remainQty), 0),
        assignedQty: groupRows.reduce((s, r) => s + num(r.assignedQty), 0),
        estWage: groupRows.reduce((s, r) => s + num(r.estWage), 0),
        ...wage,
      })
      for (const row of groupRows) {
        out.push({
          ...row,
          kind: 'line-sub',
          rowKey: `sub:${row.rowKey}`,
          editable: true,
          woText: row.lines[0]?.woNo || row.woText,
        })
      }
    } else {
      out.push({ ...groupRows[0], kind: 'task', editable: true })
    }
  }
  return out
})

const assignTableData = computed(() => {
  if (mergeSameProcess.value) return assignTableRows.value
  if (assignView.value === 'wo') return assignTableRows.value
  return assignDisplayRows.value
})

const assignSpanMethod = ({ row, columnIndex }: any) => {
  if (row.kind === 'wo-head') {
    if (columnIndex === 0) return [1, 9]
    return [0, 0]
  }
  return [1, 1]
}

const assignRowClassName = ({ row }: { row: any }) => {
  if (row.kind === 'line-sub') return 'is-wo-sub-row'
  if (row.kind === 'process-head') return 'is-process-head-row is-multi-prc-row'
  if (row.lines?.length > 1) return 'is-multi-prc-row'
  return 'is-single-prc-row'
}

/** 批量工序表行样式：单工单 / 多工单区分 */
const batchProcessRowClass = ({ row }: { row: any }) =>
  row.lines?.length > 1 ? 'is-multi-prc-row' : 'is-single-prc-row'

const assignedTaskCount = computed(() => assignRows.value.filter((r) => num(r.assignedQty) > 0).length)

const assignedTotalQty = computed(() =>
  [...lineSplitMap.value.values()].reduce((s, ws) => s + ws.reduce((a, w) => a + num(w.planQty), 0), 0)
)

const hasOverAssign = computed(() => assignRows.value.some((r) => r.overAssign))

const uniqueWorkerCount = computed(() => {
  const set = new Set<string>()
  for (const ws of Object.values(assignMap.value)) {
    for (const w of ws || []) set.add(w.empNo)
  }
  return set.size
})

const estimatedWageTotal = computed(() => {
  // 有已分数量时按已分量×各行单价；否则按未派量估算
  let total = 0
  for (const line of selectedLines.value) {
    const workers = lineSplitMap.value.get(lineKey(line)) || []
    const qty = workers.reduce((s, w) => s + num(w.planQty), 0)
    total += estimateBorWage(line, qty > 0 ? qty : undefined)
  }
  return total
})

// ---------- Step3：派工预览（明细 / 筛选 / KPI） ----------
/**
 * 已分配工人的工序行，供预览表与提交使用。
 * 数量口径：本次已派 / 可派剩余（remainQty），与分配页一致；
 * 不与 ERP 计划量对比，避免部分已派工单造成「未派满」误判。
 */
const confirmItems = computed(() =>
  selectedLines.value
    .map((line) => {
      const workers = lineSplitMap.value.get(lineKey(line)) || []
      const assignedQty = workers.reduce((s, w) => s + num(w.planQty), 0)
      const remainQty = num(line.remainQty)
      const planQty = num(line.woQty)
      const estTimeSec = estimateBorWorkSeconds(line)
      const wo = allWorkOrders.value.find((w) => w.woNo === line.woNo)
      return {
        key: lineKey(line),
        woNo: line.woNo,
        goodsName: wo?.goodsName || line.goodsName || '',
        mrName: line.mrName,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        prcName: line.prcName,
        wageTypeText: wageTypeLabel(line.pWageType),
        machiningUp: num(line.machiningUp),
        machiningTimeText: fmtMachiningTime(line.machiningTime, line.timeUnit),
        estTimeSec,
        estTimeText: fmtWorkSeconds(estTimeSec),
        assignedQty,
        remainQty,
        planQty,
        qtyPercent: remainQty > 0 ? Math.min(100, Math.round((assignedQty / remainQty) * 100)) : 0,
        workers,
        estWage: estimateBorWage(line, assignedQty),
      }
    })
    .filter((r) => r.workers.length)
)

const filteredConfirmItems = computed(() => {
  const kw = confirmFilter.keyword.trim().toLowerCase()
  return confirmItems.value.filter((item) => {
    if (confirmFilter.woNo && item.woNo !== confirmFilter.woNo) return false
    if (confirmFilter.prcKey && `${item.prcCode}|${item.prcName}` !== confirmFilter.prcKey) return false
    if (confirmFilter.empNo && !item.workers.some((w) => w.empNo === confirmFilter.empNo)) return false
    if (confirmFilter.onlyPartial && item.assignedQty >= item.remainQty - 0.000001) return false
    if (kw) {
      const hay = `${item.woNo}${item.goodsName}${item.prcCode}${item.prcName}${item.mrName}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const confirmWoOptions = computed(() => [...new Set(confirmItems.value.map((i) => i.woNo))])

const confirmPrcOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of confirmItems.value) {
    const key = `${item.prcCode}|${item.prcName}`
    map.set(key, `${item.prcCode} ${item.prcName}`.trim())
  }
  return [...map.entries()].map(([value, label]) => ({ value, label }))
})

const confirmWorkerOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of confirmItems.value) {
    for (const w of item.workers) {
      if (!map.has(w.empNo)) map.set(w.empNo, w.empName || w.empNo)
    }
  }
  return [...map.entries()].map(([empNo, label]) => ({ empNo, label }))
})

const confirmFilterActive = computed(() => {
  let n = 0
  if (confirmFilter.keyword.trim()) n++
  if (confirmFilter.woNo) n++
  if (confirmFilter.prcKey) n++
  if (confirmFilter.empNo) n++
  if (confirmFilter.onlyPartial) n++
  return n
})

const resetConfirmFilter = () => {
  confirmFilter.keyword = ''
  confirmFilter.woNo = ''
  confirmFilter.prcKey = ''
  confirmFilter.empNo = ''
  confirmFilter.onlyPartial = false
}

const buildConfirmGroupStats = (items: typeof confirmItems.value) => ({
  taskCount: items.length,
  assignedQty: items.reduce((s, i) => s + i.assignedQty, 0),
  remainQty: items.reduce((s, i) => s + i.remainQty, 0),
  planQty: items.reduce((s, i) => s + i.planQty, 0),
  estTimeSec: items.reduce((s, i) => s + i.estTimeSec, 0),
  estWage: items.reduce((s, i) => s + i.estWage, 0),
})

/** 预览表分组数据（工单或工序）+ 组内小计 */
const displayConfirmGroups = computed(() => {
  const items = filteredConfirmItems.value
  if (confirmGroupBy.value === 'process') {
    const map = new Map<string, { groupKey: string; title: string; subtitle: string; items: typeof items }>()
    for (const item of items) {
      const pk = `${item.mrCode || ''}|${item.prcCode || ''}`
      const hit = map.get(pk)
      if (hit) {
        hit.items.push(item)
        if (!hit.subtitle.includes(item.woNo)) {
          hit.subtitle = hit.subtitle ? `${hit.subtitle}、${item.woNo}` : item.woNo
        }
      } else {
        map.set(pk, {
          groupKey: pk,
          title: `${item.prcCode} ${item.prcName}`.trim(),
          subtitle: item.woNo,
          items: [item],
        })
      }
    }
    return [...map.values()].map((g) => ({ ...g, ...buildConfirmGroupStats(g.items) }))
  }
  const map = new Map<string, { groupKey: string; title: string; subtitle: string; items: typeof items }>()
  for (const item of items) {
    const hit = map.get(item.woNo)
    if (hit) {
      hit.items.push(item)
    } else {
      map.set(item.woNo, {
        groupKey: item.woNo,
        title: item.woNo,
        subtitle: item.goodsName || '',
        items: [item],
      })
    }
  }
  return [...map.values()].map((g) => ({ ...g, ...buildConfirmGroupStats(g.items) }))
})

const buildConfirmSummary = (items: typeof confirmItems.value) => {
  const workerSet = new Set<string>()
  for (const item of items) {
    for (const w of item.workers) workerSet.add(w.empNo)
  }
  return {
    taskCount: items.length,
    woCount: new Set(items.map((i) => i.woNo)).size,
    prcCount: new Set(items.map((i) => `${i.mrCode || ''}|${i.prcCode || ''}`)).size,
    assignedQty: items.reduce((s, i) => s + i.assignedQty, 0),
    remainQty: items.reduce((s, i) => s + i.remainQty, 0),
    planQty: items.reduce((s, i) => s + i.planQty, 0),
    estTimeSec: items.reduce((s, i) => s + i.estTimeSec, 0),
    estWage: items.reduce((s, i) => s + i.estWage, 0),
    workerCount: workerSet.size,
  }
}

const filteredConfirmSummary = computed(() => buildConfirmSummary(filteredConfirmItems.value))

const exportConfirmPreview = () => {
  const rows = filteredConfirmItems.value
  if (!rows.length) {
    $baseMessage('没有可导出的数据', 'warning', 'hey')
    return
  }
  const headers = [
    '工单号',
    '品名',
    '工序编号',
    '工序名称',
    '工序类型',
    '计薪方式',
    '加工单价',
    '加工工时',
    '派工数量',
    '可派剩余',
    '计划数量',
    '人员分配',
    '预计工时',
    '总工价',
  ]
  const body = rows.map((r) => [
    r.woNo,
    r.goodsName,
    r.prcCode,
    r.prcName,
    r.mrName,
    r.wageTypeText,
    fmtNum(r.machiningUp),
    r.machiningTimeText,
    fmtNum(r.assignedQty),
    fmtNum(r.remainQty),
    fmtNum(r.planQty),
    r.workers.map((w) => `${w.empName || w.empNo}:${fmtNum(w.planQty)}`).join(';'),
    r.estTimeText,
    fmtNum(r.estWage),
  ])
  const csv = [headers, ...body]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `派工预览_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  $baseMessage(`已导出 ${rows.length} 条派工明细`, 'success', 'hey')
}

/** 顶部 KPI：承接原表格底部汇总（任务/数量/工时/工价/人员） */
const confirmKpiCards = computed(() => {
  const s = filteredConfirmSummary.value
  return [
    {
      key: 'task',
      label: '派工任务',
      value: `${s.taskCount} 个`,
      sub: `${s.woCount} 张工单 · ${s.prcCount} 道工序`,
      icon: TrendCharts,
      tone: 'green',
    },
    {
      key: 'qty',
      label: '派工数量',
      value: `${fmtNum(s.assignedQty)} / ${fmtNum(s.remainQty)}`,
      sub: '本次已派 / 可派剩余',
      icon: Box,
      tone: 'orange',
    },
    {
      key: 'time',
      label: '预计工时',
      value: fmtWorkSeconds(s.estTimeSec),
      icon: Clock,
      tone: 'cyan',
    },
    {
      key: 'wage',
      label: '总工价',
      value: `¥${fmtNum(s.estWage)}`,
      icon: Document,
      tone: 'amber',
    },
    {
      key: 'worker',
      label: '涉及人员',
      value: `${s.workerCount} 人`,
      icon: User,
      tone: 'indigo',
    },
  ]
})

const workerInitial = (name: string) => String(name || '?').trim().slice(0, 1) || '?'

const canGoConfirm = computed(
  () => assignedTaskCount.value > 0 && assignedTotalQty.value > 0 && !hasOverAssign.value
)

const canSubmit = computed(() => confirmItems.value.length > 0 && !hasOverAssign.value)

// ---------- 选人弹窗 / 一键派工 ----------
const isOneClickMode = computed(() => editingTaskKey.value === ONE_CLICK_MODE)

/** 无工人或已派数量为 0 → 视为未派，可被一键派工覆盖 */
const isTaskUnassigned = (taskKey: string) => {
  const ws = assignMap.value[taskKey] || []
  return !ws.length || !ws.some((w) => num(w.planQty) > 0)
}

const unassignedAssignRows = computed(() => assignRows.value.filter((r) => isTaskUnassigned(r.taskKey)))

/** 弹窗右侧/表格回显的已选人员 */
const empDialogSelected = computed(() => {
  if (isOneClickMode.value) {
    return oneClickTemplateWorkers.value.map((w) => ({
      empNo: w.empNo,
      empName: w.empName,
      deptName: w.deptName,
    }))
  }
  const lines = editingAllocLines.value
  if (lines.length > 0) {
    if (lines.length === 1) {
      const list = assignMap.value[lines[0].key] || []
      return list.map((w) => ({ empNo: w.empNo, empName: w.empName, deptName: w.deptName }))
    }
    const union = new Map<string, { empNo: string; empName?: string; deptName?: string }>()
    for (const line of lines) {
      for (const w of assignMap.value[line.key] || []) {
        if (!union.has(w.empNo)) {
          union.set(w.empNo, { empNo: w.empNo, empName: w.empName, deptName: w.deptName })
        }
      }
    }
    return [...union.values()]
  }
  const list = assignMap.value[editingTaskKey.value] || []
  return list.map((w) => ({ empNo: w.empNo, empName: w.empName, deptName: w.deptName }))
})

const empDialogTitle = computed(() => {
  if (isOneClickMode.value) {
    const n = unassignedAssignRows.value.length
    return `一键派工 · 人员配比（${n} 道未派工序）`
  }
  const lines = editingAllocLines.value
  if (lines.length === 1) {
    const l = lines[0]
    return `选择人员 · ${l.woNo} · ${l.prcCode || ''} ${l.prcName || ''}`.trim()
  }
  if (lines.length > 1) {
    const l = lines[0]
    return `选择人员 · ${l.prcCode || ''} ${l.prcName || ''}（${lines.length} 张工单）`.trim()
  }
  return '选择人员'
})

const editingLineWorkers = computed(() => {
  if (isOneClickMode.value && editingAllocLines.value.length) {
    return {
      [ONE_CLICK_TEMPLATE_KEY]: oneClickTemplateWorkers.value.map((w) => ({
        empNo: w.empNo,
        empName: w.empName,
        deptName: w.deptName,
        ratio: num(w.ratio),
        planQty: num(w.planQty),
      })),
    }
  }
  if (!editingAllocLines.value.length) return undefined
  const map: Record<string, AllocWorker[]> = {}
  for (const line of editingAllocLines.value) {
    map[line.key] = (assignMap.value[line.key] || []).map((w) => ({
      empNo: w.empNo,
      empName: w.empName,
      deptName: w.deptName,
      ratio: num(w.ratio),
      planQty: num(w.planQty),
    }))
  }
  return map
})

const buildAllocLine = (line: any): EmpAllocLine => ({
  key: lineKey(line),
  woNo: line.woNo,
  remainQty: num(line.remainQty),
  planQty: num(line.woQty),
  machiningUp: num(line.machiningUp),
  prcCode: line.prcCode,
  prcName: line.prcName,
})

const buildEditingAllocLines = (line: any): EmpAllocLine[] => {
  const pk = processKey(line)
  const group = selectedLines.value.filter((l) => processKey(l) === pk)
  return group.map(buildAllocLine)
}

const goStep = (idx: number) => {
  if (idx === 0) wizardStep.value = 0
  else if (idx === 1 && selectedLines.value.length) wizardStep.value = 1
  else if (idx === 2 && canGoConfirm.value) wizardStep.value = 2
}

const ensureWoLines = async (wo: any) => {
  const woNo = wo.woNo
  if (linesByWo.value[woNo]) return
  const lines = await getQuickDispatchProcesses({ woNo, moNo: queryMoNo.value || wo.moNo })
  linesByWo.value = { ...linesByWo.value, [woNo]: lines || [] }
}

const toggleWo = async (wo: any, checked: boolean) => {
  const next = new Set(selectedWoSet.value)
  if (checked) {
    next.add(wo.woNo)
    selectedWoSet.value = next
    activeWoNo.value = wo.woNo
    prcLoading.value = true
    try {
      await ensureWoLines(wo)
    } catch (e: any) {
      $baseMessage(e?.message || '加载工序失败', 'error', 'hey')
    } finally {
      prcLoading.value = false
    }
  } else {
    next.delete(wo.woNo)
    selectedWoSet.value = next
    const drop = new Set((linesByWo.value[wo.woNo] || []).map(lineKey))
    checkedLeafIds.value = checkedLeafIds.value.filter((id) => !drop.has(id))
    if (activeWoNo.value === wo.woNo) activeWoNo.value = selectedWoNos.value[0] || ''
  }
}

/** 点击工单卡片：未选则选中；已选则切为当前；当前已选再点则取消 */
const onWoCardClick = (wo: any) => {
  const selected = selectedWoSet.value.has(wo.woNo)
  if (!selected) {
    void toggleWo(wo, true)
    return
  }
  if (activeWoNo.value !== wo.woNo) {
    activeWoNo.value = wo.woNo
    return
  }
  void toggleWo(wo, false)
}

const setLineChecked = (line: any, checked: boolean) => {
  const id = lineKey(line)
  const set = new Set(checkedLeafIds.value)
  if (checked) set.add(id)
  else set.delete(id)
  checkedLeafIds.value = [...set]
}

const toggleGroup = (group: any, checked: boolean) => {
  const set = new Set(checkedLeafIds.value)
  for (const line of group.lines) {
    const id = lineKey(line)
    if (checked) set.add(id)
    else set.delete(id)
  }
  checkedLeafIds.value = [...set]
}

const onCurrentLineSelection = (rows: any[]) => {
  if (syncingCurrentTable.value) return
  const woNo = activeWoNo.value
  if (!woNo) return
  const other = checkedLeafIds.value.filter((id) => !String(id).startsWith(`${woNo}|`))
  const cur = (rows || []).map((r) => lineKey(r))
  checkedLeafIds.value = [...other, ...cur]
}

const syncCurrentTableSelection = async () => {
  await nextTick()
  const table = currentTableRef.value
  if (!table || pickTab.value !== 'current') return
  syncingCurrentTable.value = true
  table.clearSelection()
  const keep = new Set(checkedLeafIds.value)
  activeWoLines.value.forEach((row) => {
    if (keep.has(row.__key)) table.toggleRowSelection(row, true)
  })
  await nextTick()
  syncingCurrentTable.value = false
}

watch([activeWoNo, pickTab, () => checkedLeafIds.value.join('|')], () => {
  if (pickTab.value === 'current') syncCurrentTableSelection()
})

const clearSelection = () => {
  checkedLeafIds.value = []
  selectedWoSet.value = new Set()
  assignMap.value = {}
  oneClickTemplateWorkers.value = []
}

/** 单任务行选人（合并模式仅选人，非合并进入单工单配比） */
const openEmpFor = (taskKey: string) => {
  editingTaskKey.value = taskKey
  if (mergeSameProcess.value) {
    editingAllocLines.value = []
    empDialog.value = true
    return
  }
  const line = selectedLines.value.find((l) => lineKey(l) === taskKey)
  if (!line) return
  editingAllocLines.value = [buildAllocLine(line)]
  empDialog.value = true
}

/** 工序头选人：同工序下各工单一起进入多行配比 */
const openEmpForProcess = (pk: string) => {
  const line = selectedLines.value.find((l) => processKey(l) === pk)
  if (!line) return
  editingTaskKey.value = lineKey(line)
  editingAllocLines.value = buildEditingAllocLines(line)
  empDialog.value = true
}

/**
 * 一键派工：弹出配比模板。
 * allocLines 仅作 UI 预览（数量按样例行未派量），真正写入在 confirm 时按各未派工序重算。
 */
const openOneClickDispatch = () => {
  if (!selectedLines.value.length) {
    $baseMessage('请先选择工序', 'warning', 'hey')
    return
  }
  const unassigned = unassignedAssignRows.value
  if (!unassigned.length) {
    $baseMessage('所有工序已分配人员', 'info', 'hey')
    return
  }
  const sample = unassigned[0]
  editingTaskKey.value = ONE_CLICK_MODE
  editingAllocLines.value = [
    {
      key: ONE_CLICK_TEMPLATE_KEY,
      woNo: `将应用到 ${unassigned.length} 道未派工序`,
      remainQty: num(sample.remainQty),
      planQty: num(sample.planQty),
      machiningUp: num(sample.machiningUp),
      prcCode: unassigned.length > 1 ? '配比模板' : String(sample.prcCode || ''),
      prcName:
        unassigned.length > 1 ? '确认后按各工序未派量写入' : String(sample.prcName || ''),
    },
  ]
  empDialog.value = true
}

/** 任务行可分配上限 = 未派量 */
const taskCap = (taskKey: string) => {
  const row = assignRows.value.find((r) => r.taskKey === taskKey)
  return num(row?.remainQty)
}

/** 触发 assignMap 浅拷贝，保证表格响应式刷新 */
const touchTask = (taskKey: string) => {
  assignMap.value = { ...assignMap.value, [taskKey]: [...(assignMap.value[taskKey] || [])] }
}

/** 比例 = 占本行未派量的百分比 */
const redistributeTaskByRatio = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length || cap <= 0) return
  redistributeWorkersByRatio(list, cap)
  touchTask(taskKey)
}

const syncTaskRatioFromQty = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length) return
  syncWorkersRatioFromQty(list, cap)
  touchTask(taskKey)
}

const applyEqualTask = (taskKey: string) => {
  const list = assignMap.value[taskKey] || []
  const cap = taskCap(taskKey)
  if (!list.length) return
  applyEqualWorkers(list, cap)
  touchTask(taskKey)
}

const applyEqualAll = () => {
  for (const row of assignRows.value) {
    if (row.workers?.length) applyEqualTask(row.taskKey)
  }
}

const selectAllLinesForSelectedWos = async () => {
  prcLoading.value = true
  try {
    for (const woNo of selectedWoNos.value) {
      const wo = allWorkOrders.value.find((w) => w.woNo === woNo)
      if (wo) await ensureWoLines(wo)
    }
    const ids: string[] = []
    for (const woNo of selectedWoNos.value) {
      for (const line of linesByWo.value[woNo] || []) {
        if (num(line.remainQty) > 0) ids.push(lineKey(line))
      }
    }
    checkedLeafIds.value = ids
  } finally {
    prcLoading.value = false
  }
}

const selectedPrcCodes = computed(() => {
  const set = new Set<string>()
  for (const line of selectedLines.value) {
    if (line?.prcCode) set.add(String(line.prcCode))
  }
  return [...set]
})

/** 按推荐得分折算比例（合计 100%）；得分相同或缺失时退化为平均 */
const ratiosFromScores = (emps: any[]) => {
  const n = emps.length
  if (!n) return []
  if (n === 1) return [100]
  const weights = emps.map((e) => Math.max(0, num(e.score)))
  const sum = weights.reduce((s, w) => s + w, 0)
  if (sum <= 0) return equalRatios(n)
  let assigned = 0
  return emps.map((_, i) => {
    if (i === n - 1) return Math.max(0, 100 - assigned)
    const r = Math.round((weights[i] * 100) / sum)
    assigned += r
    return r
  })
}

const equalRatios = (n: number) => {
  if (n <= 0) return []
  const each = Math.floor(100 / n)
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 100 - each * (n - 1) : each))
}

const smartPreviewRatio = (emp: any) => {
  const list = smartPreview.value
  if (!list.length || !emp?.empNo) return 0
  const idx = list.findIndex((e) => e.empNo === emp.empNo)
  if (idx < 0) return 0
  return ratiosFromScores(list)[idx] ?? 0
}

const openSmartDialog = async () => {
  if (!selectedWoNos.value.length) {
    $baseMessage('请先勾选工单', 'warning', 'hey')
    return
  }
  smartPreview.value = []
  smartPreviewTried.value = false
  smartDialog.value = true
  if (!selectedLines.value.length) {
    await selectAllLinesForSelectedWos()
  }
}

const previewSmartSuggest = async () => {
  if (!selectedLines.value.length) {
    await selectAllLinesForSelectedWos()
  }
  if (!selectedLines.value.length) {
    $baseMessage('所选工单没有可派工序', 'warning', 'hey')
    return
  }
  smartLoading.value = true
  smartPreviewTried.value = true
  try {
    const data = await getQuickDispatchSmartSuggest({
      deptId: preferredDeptId.value,
      prcCodes: selectedPrcCodes.value,
      limit: smartLimit.value,
      days: smartDays.value,
    })
    smartPreview.value = Array.isArray(data?.employees) ? data.employees : []
    if (!smartPreview.value.length) {
      $baseMessage('未找到可推荐人员', 'warning', 'hey')
    }
  } catch (e: any) {
    smartPreview.value = []
    $baseMessage(e?.message || '智能推荐失败', 'error', 'hey')
  } finally {
    smartLoading.value = false
  }
}

/**
 * 将人员批量写入全部任务（智能派工会覆盖已有分配）。
 * byScore=true 按推荐得分占比；否则平均。
 */
const applyEmpsToAllTasks = async (
  emps: any[],
  successMsg: string,
  byScore = false,
  advanceStep = true
) => {
  if (!emps.length) return
  const ratios = byScore ? ratiosFromScores(emps) : equalRatios(emps.length)
  const next: Record<string, AllocWorker[]> = {}
  for (const row of assignRows.value) {
    next[row.taskKey] = emps.map((e: any, i: number) => ({
      empNo: e.empNo,
      empName: e.empName,
      deptName: e.deptName,
      ratio: ratios[i] ?? 0,
      planQty: 0,
    }))
  }
  assignMap.value = next
  await nextTick()
  for (const row of assignRows.value) {
    if (byScore) redistributeTaskByRatio(row.taskKey)
    else applyEqualTask(row.taskKey)
  }
  smartDialog.value = false
  wizardStep.value = advanceStep && canGoConfirm.value ? 2 : 1
  $baseMessage(successMsg, 'success', 'hey')
}

/**
 * 一键派工确认：仅写入未派工序，已派任务保留。
 * 模板中的 planQty 仅作弹窗预览；此处按各任务 remainQty × ratio 重算。
 */
const applyOneClickFromTemplate = (template: AllocWorker[]) => {
  const unassigned = unassignedAssignRows.value
  if (!template.length || !unassigned.length) return 0
  const next = { ...assignMap.value }
  for (const row of unassigned) {
    const cap = num(row.remainQty)
    const workers = template.map((w) => ({
      empNo: w.empNo,
      empName: w.empName,
      deptName: w.deptName,
      ratio: num(w.ratio),
      planQty: 0,
    }))
    redistributeWorkersByRatio(workers, cap)
    next[row.taskKey] = workers
  }
  assignMap.value = next
  oneClickTemplateWorkers.value = template.map((w) => ({
    empNo: w.empNo,
    empName: w.empName,
    deptName: w.deptName,
    ratio: num(w.ratio),
    planQty: num(w.planQty),
  }))
  return unassigned.length
}

const applySmartDispatch = async () => {
  if (!selectedWoNos.value.length) {
    $baseMessage('请先勾选工单', 'warning', 'hey')
    return
  }
  smartLoading.value = true
  try {
    if (!selectedLines.value.length) await selectAllLinesForSelectedWos()
    await nextTick()
    if (!selectedLines.value.length) {
      $baseMessage('所选工单没有可派工序', 'warning', 'hey')
      return
    }
    let emps = smartPreview.value
    if (!emps.length) {
      const data = await getQuickDispatchSmartSuggest({
        deptId: preferredDeptId.value,
        prcCodes: selectedPrcCodes.value,
        limit: smartLimit.value,
        days: smartDays.value,
      })
      emps = Array.isArray(data?.employees) ? data.employees : []
      smartPreview.value = emps
      smartPreviewTried.value = true
    }
    if (!emps.length) {
      $baseMessage('智能推荐无结果，请打开选择人员窗口手动选人', 'warning', 'hey')
      return
    }
    const names = emps.map((e: any) => e.empName || e.empNo).join('、')
    const ratioHint = ratiosFromScores(emps).map((r) => `${r}%`).join(' / ')
    await applyEmpsToAllTasks(emps, `智能派工已采用（${names}，比例 ${ratioHint}），请确认提交`, true)
  } catch (e: any) {
    $baseMessage(e?.message || '智能派工失败', 'error', 'hey')
  } finally {
    smartLoading.value = false
  }
}

/** 改比例 → 重算数量 */
const onWorkerRatioChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    redistributeTaskByRatio(taskKey)
  } finally {
    allocSyncing.value = false
  }
}

/** 改数量 → 回写比例（与比例双向联动） */
const onWorkerQtyChange = (taskKey: string) => {
  if (allocSyncing.value) return
  allocSyncing.value = true
  try {
    syncTaskRatioFromQty(taskKey)
  } finally {
    allocSyncing.value = false
  }
}


const removeWorker = (taskKey: string, empNo: string) => {
  const list = (assignMap.value[taskKey] || []).filter((w) => w.empNo !== empNo)
  assignMap.value = { ...assignMap.value, [taskKey]: list }
  if (list.length) applyEqualTask(taskKey)
}


/** 纯选人确认（无配比区）：写入当前任务并默认平均数量 */
const onEmpPickerConfirm = (emps: { empNo: string; empName?: string; deptName?: string }[]) => {
  editingAllocLines.value = []
  const key = editingTaskKey.value
  if (!key || key === ONE_CLICK_MODE) return
  const prev = new Map((assignMap.value[key] || []).map((w) => [w.empNo, w]))
  const n = emps.length
  assignMap.value = {
    ...assignMap.value,
    [key]: emps.map((e) => {
      const old = prev.get(e.empNo)
      return {
        empNo: e.empNo,
        empName: e.empName,
        deptName: e.deptName,
        ratio: num(old?.ratio),
        planQty: num(old?.planQty),
      }
    }),
  }
  if (!n) return
  applyEqualTask(key)
}

/**
 * 带配比确认：
 * - 一键派工 → 按模板批量写未派工序
 * - 否则 → 按弹窗返回的各工单配比写回 assignMap
 */
const onEmpPickerConfirmAlloc = (lines: { key: string; workers: AllocWorker[] }[]) => {
  if (editingTaskKey.value === ONE_CLICK_MODE) {
    const templateLine = lines.find((l) => l.key === ONE_CLICK_TEMPLATE_KEY) || lines[0]
    const template = templateLine?.workers || []
    if (!template.length) return
    const count = applyOneClickFromTemplate(template)
    editingAllocLines.value = []
    editingTaskKey.value = ''
    const names = template.map((w) => w.empName || w.empNo).join('、')
    $baseMessage(`一键派工完成（${names}），已批量写入 ${count} 道未派工序`, 'success', 'hey')
    return
  }
  const next = { ...assignMap.value }
  for (const { key, workers } of lines) {
    next[key] = workers
  }
  assignMap.value = next
  editingAllocLines.value = []
  editingTaskKey.value = ''
  $baseMessage('人员分配已更新，请核对比例与数量后确认派工', 'success', 'hey')
}

/** 加载可派工工单列表（制令/工单号筛选） */
const loadPreview = async () => {
  loading.value = true
  try {
    const data = await getQuickDispatchPreview({
      moNo: queryMoNo.value,
      woNo: queryWoNo.value,
    })
    allWorkOrders.value = (data.workOrders || []).filter((w: any) => num(w.remainQty) > 0)
    if (!activeWoNo.value && allWorkOrders.value[0]) activeWoNo.value = allWorkOrders.value[0].woNo
  } catch (e: any) {
    allWorkOrders.value = []
    $baseMessage(e?.message || '加载失败', 'error', 'hey')
  } finally {
    loading.value = false
  }
}

const onWoSearchEnter = () => {
  const kw = woKeyword.value.trim()
  if (/^W\d+/i.test(kw)) {
    queryWoNo.value = kw
    queryMoNo.value = ''
    loadPreview()
  }
}

/**
 * 提交派工：以拆分后的单工序行 + 工人数量调用后端。
 * 合并模式下 lineSplitMap 已按工费份额拆到各工单。
 */
const submit = async () => {
  if (!canSubmit.value) return
  const mo =
    queryMoNo.value ||
    selectedLines.value[0]?.moNo ||
    allWorkOrders.value.find((w) => w.woNo === selectedLines.value[0]?.woNo)?.moNo
  if (!mo) {
    $baseMessage('缺少制令号，无法生成派工单', 'warning', 'hey')
    return
  }
  const items = selectedLines.value
    .map((line) => {
      const workers = (lineSplitMap.value.get(lineKey(line)) || []).map((w) => ({
        empNo: w.empNo,
        planQty: num(w.planQty),
      }))
      return {
        woNo: line.woNo,
        moNo: line.moNo,
        mrCode: line.mrCode,
        prcCode: line.prcCode,
        goodsId: line.goodsId,
        woBorSno: line.woBorSno,
        workers,
      }
    })
    .filter((it) => it.workers.length)
  if (!items.length) {
    $baseMessage('没有可提交的工序分配', 'warning', 'hey')
    return
  }
  const workerAgg = new Map<string, number>()
  for (const it of items) {
    for (const w of it.workers) {
      workerAgg.set(w.empNo, (workerAgg.get(w.empNo) || 0) + num(w.planQty))
    }
  }
  saving.value = true
  try {
    const result = await submitQuickDispatch({
      moNo: mo,
      woNos: [...new Set(items.map((i) => i.woNo))],
      processes: items.map((i) => ({
        woNo: i.woNo,
        mrCode: i.mrCode,
        prcCode: i.prcCode,
        goodsId: i.goodsId,
        woBorSno: i.woBorSno,
      })),
      workers: [...workerAgg.entries()].map(([empNo, planQty]) => ({ empNo, planQty })),
      items,
    })
    $baseMessage(`已生成派工单 ${result?.wtNo || ''}`, 'success', 'hey')
    clearSelection()
    assignMap.value = {}
    wizardStep.value = 0
    await loadPreview()
  } catch (e: any) {
    $baseMessage(e?.message || '生成派工单失败', 'error', 'hey')
  } finally {
    saving.value = false
  }
}

watch(mergeSameProcess, () => {
  assignMap.value = {}
  assignView.value = 'process'
})

watch(selectedLines, () => {
  // 清理已不在选中范围的分配
  const valid = new Set(assignRows.value.map((r) => r.taskKey))
  const next: Record<string, AllocWorker[]> = {}
  for (const [k, v] of Object.entries(assignMap.value)) {
    if (valid.has(k)) next[k] = v
  }
  assignMap.value = next
})

onMounted(() => {
  const q = route.query || {}
  if (q.moNo) queryMoNo.value = String(q.moNo)
  if (q.woNo) {
    queryWoNo.value = String(q.woNo)
    woKeyword.value = String(q.woNo)
  }
  loadPreview()
})

</script>

<style lang="scss" scoped>
.nd-page {
  --nd-green: #2e7d5a;
  --nd-ink: #1f2d26;
  --nd-muted: #6b7c72;
  --nd-line: #d8e4dc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  color: var(--nd-ink);
}

.nd-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: linear-gradient(100deg, #f3faf6 0%, #fff 55%, #f7fafc 100%);

  h1 {
    margin: 0;
    font-size: 18px;
    color: var(--nd-green);
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-steps {
  display: flex;
  gap: 8px;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    color: #8a9b90;
    cursor: pointer;

    i {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-style: normal;
      font-size: 12px;
      background: #dce8e0;
    }

    &.is-current,
    &.is-done {
      color: var(--nd-green);
      font-weight: 600;

      i {
        background: var(--nd-green);
        color: #fff;
      }
    }
  }
}

.nd-step--pick {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 8px;
}

.nd-wo-pane,
.nd-prc-pane,
.nd-assign-pane,
.nd-side-summary {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.nd-wo-pane {
  padding: 10px;

  > header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    em {
      font-style: normal;
      font-size: 12px;
      color: var(--nd-muted);
    }
  }
}

.nd-wo-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-top: 8px;
}

.nd-wo-card {
  --wo-accent: var(--nd-green);
  position: relative;
  display: flex;
  gap: 0;
  align-items: stretch;
  padding: 0;
  margin-bottom: 10px;
  border: 1px solid #dfeae3;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(42, 58, 50, 0.04);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--wo-accent) 45%, #dfeae3);
    box-shadow: 0 4px 12px rgba(42, 58, 50, 0.08);
    transform: translateY(-1px);
  }

  &:focus-visible {
    border-color: var(--wo-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--wo-accent) 22%, transparent);
  }

  &__accent {
    width: 4px;
    flex-shrink: 0;
    border-radius: 10px 0 0 10px;
    background: color-mix(in srgb, var(--wo-accent) 55%, #c8d9cf);
  }

  &__body {
    flex: 1;
    min-width: 0;
    padding: 12px 36px 12px 12px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    b {
      font-size: 13px;
      color: var(--nd-ink);
      letter-spacing: 0.02em;
    }
  }

  &__check {
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--nd-green);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  p {
    margin: 6px 0 8px;
    font-size: 12px;
    color: var(--nd-muted);
    line-height: 1.4;
  }

  &.is-checked {
    border-color: color-mix(in srgb, var(--nd-green) 55%, #dfeae3);
    background: linear-gradient(135deg, #f4fbf7 0%, #eef8f2 100%);
    box-shadow: 0 2px 8px rgba(46, 125, 90, 0.12);

    .nd-wo-card__accent {
      background: var(--nd-green);
    }

    .nd-wo-card__top b {
      color: var(--nd-green);
    }
  }

  &.is-active {
    border-color: var(--nd-green);
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--nd-green) 18%, transparent),
      0 4px 12px rgba(46, 125, 90, 0.14);
  }

  &.is-checked.is-active {
    background: linear-gradient(135deg, #ecf8f1 0%, #e4f4eb 100%);
  }
}

.nd-prc-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e8f0eb;
  font-size: 13px;

  .nd-merge-tip {
    margin-left: 4px;
    color: #9aaba0;
    vertical-align: middle;
    cursor: help;
  }

  b {
    color: var(--nd-green);
    margin: 0 2px;
  }
}

.nd-prc-pane {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
  }
}

.nd-prc-pane__body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;

  :deep(.is-single-prc-row > td) {
    background: #fff;
  }

  :deep(.is-multi-prc-row > td) {
    background: #fffaf3;
  }

  :deep(.is-multi-prc-row > td:first-child) {
    box-shadow: inset 3px 0 0 #f59e0b;
  }

  :deep(.is-single-prc-row > td:first-child) {
    box-shadow: inset 3px 0 0 #94a3b8;
  }

  > .el-table {
    flex: 1;
    min-height: 0;
  }
}

.nd-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 6px 10px;
  border: 1px solid #e5eee8;
  border-radius: 8px;
  background: #f7faf8;

  &__tip {
    font-size: 12px;
    color: var(--nd-muted);
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}

.nd-batch-prc {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;

  &__name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
}

.nd-scope-tag {
  flex-shrink: 0;
}

.nd-wo-scope {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;

  &.is-single {
    color: #475569;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
  }

  &.is-multi {
    color: #c2410c;
    background: #fff7ed;
    border: 1px solid #fed7aa;
  }
}

.nd-prc-pane__foot,
.nd-assign-pane footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e8f0eb;
  background: #fbfdfb;
  font-size: 12px;
  color: var(--nd-muted);
}

.nd-expand {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 12px 8px 48px;

  &.is-multi {
    background: linear-gradient(90deg, #fff7ed 0%, transparent 60%);
    border-radius: 6px;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  &__meta {
    font-size: 12px;
    color: var(--nd-muted);
  }
}

.nd-mixed,
.nd-up-cell small {
  display: block;
  font-size: 11px;
  color: #ea580c;
}

.nd-up-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.nd-cover-tag {
  margin-left: 0;
}

.nd-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 6px 4px 0;
  font-size: 12px;
  color: var(--nd-muted);

  i {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;

    &.is-all,
    &.is-done {
      background: #2e7d5a;
    }

    &.is-none {
      background: #94a3b8;
    }

    &.is-part,
    &.is-partial,
    &.is-multi {
      background: #ea580c;
    }

    &.is-single {
      background: #64748b;
    }
  }
}

.nd-step--assign {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 8px;
}

.nd-side-summary {
  padding: 12px;

  header {
    font-weight: 600;
    margin-bottom: 8px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 13px;

      i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--c);
      }
    }
  }

  dl {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    div {
      padding: 8px;
      border-radius: 8px;
      background: #f5f8f6;
    }

    dt {
      font-size: 11px;
      color: var(--nd-muted);
    }

    dd {
      margin: 2px 0 0;
      font-weight: 700;
      color: var(--nd-green);
    }
  }
}

.nd-assign-pane {
  > .nd-assign-pane__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-bottom: 1px solid #e8f0eb;
  }

  &__head-left,
  &__head-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .nd-mode-alert {
    flex: 1 1 100%;
    min-width: 280px;

    :deep(.el-alert) {
      padding: 6px 10px;
    }

    :deep(.el-alert__title) {
      font-size: 12px;
      line-height: 1.45;
    }
  }

  .nd-hint {
    font-size: 12px;
    color: var(--nd-muted);
  }

  .nd-picked-workers {
    max-width: 320px;
    font-size: 12px;
    color: #2e7d5a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :deep(.el-table) {
    flex: 1;
  }

  :deep(.is-wo-sub-row > td) {
    background: #fbfdfb;
  }

  :deep(.is-wo-sub-row > td:first-child) {
    border-left: 3px solid #dce8e0;
    padding-left: 20px;
  }

  :deep(.is-process-head-row > td) {
    background: #fff7ed;
  }

  :deep(.is-multi-prc-row > td:first-child) {
    box-shadow: inset 3px 0 0 #f59e0b;
  }

  :deep(.is-single-prc-row > td:first-child) {
    box-shadow: inset 3px 0 0 #94a3b8;
  }

  footer .is-bad,
  .is-bad {
    color: #c45656;

    :deep(.nd-dispatch-badge) {
      color: #c45656;
      background: #fef2f2;
      border-color: #fecaca;
    }
  }
}

.nd-prc-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  &--head .nd-prc-cell__title span {
    font-weight: 600;
    color: var(--nd-ink);
  }

  small {
    color: #8a9b90;
    font-size: 11px;
  }
}

.nd-wo-under-prc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;

  small {
    font-size: 11px;
    color: #9aaba0;
  }
}

.nd-fine {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;

  &--head {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  &__card {
    border: 1px solid #dce8e0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fbfdfb;
  }

  &__who {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;

    em {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--nd-green);
      color: #fff;
      font-style: normal;
      font-size: 12px;
      font-weight: 700;
    }

    strong {
      display: block;
      font-size: 13px;
      line-height: 1.2;
    }

    span {
      font-size: 11px;
      color: #8a9b90;
    }
  }

  &__remove {
    border: 0;
    background: transparent;
    font-size: 18px;
    color: #a0aea6;
    cursor: pointer;
    line-height: 1;
  }

  &__fields {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) 1fr auto;
    gap: 8px;
    align-items: end;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: var(--nd-muted);
    }

    :deep(.el-input-number) {
      width: 100%;
    }
  }

  &__ratio-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;

    b {
      min-width: 36px;
      text-align: right;
      font-size: 12px;
      color: var(--nd-green);
      font-variant-numeric: tabular-nums;
    }

    :deep(.el-slider) {
      margin: 0 4px;
    }
  }

  &__wage {
    font-size: 12px;
    color: #2e7d5a;
    font-weight: 700;
    padding-bottom: 4px;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__warn {
    margin: 0;
    font-size: 12px;
    color: #c45656;
  }
}

.nd-wo-head-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.nd-wo-head {
  color: var(--nd-green);
}

.nd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 4px;
  border-radius: 999px;
  background: #e8f4ec;
  font-size: 12px;

  &--sm {
    border-radius: 6px;
    padding: 2px 6px;
  }
}

.nd-muted {
  color: #9aaba0;
  font-size: 12px;
}

.is-ok {
  color: var(--nd-green);
}

.nd-step--confirm {
  flex: 1;
  min-height: 0;
}

.nd-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1;

  &__hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border: 1px solid var(--nd-line);
    border-radius: 10px;
    background: #fff;
  }

  &__hero-text {
    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 18px;
      color: var(--nd-ink);
    }

    p {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--nd-muted);
    }
  }

  &__hero-icon {
    color: var(--nd-green);
    font-size: 20px;
  }

  &__hero-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  &__kpi {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  &__panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--nd-line);
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
  }

  &__panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid #e8f0eb;
    font-size: 14px;
  }

  &__panel-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__summary-left,
  &__summary-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--nd-line);
    border-radius: 10px;
    background: #fff;
  }
}

.nd-preview-kpi {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--nd-line);
  border-radius: 10px;
  background: #fff;
  min-width: 0;

  em {
    display: block;
    font-style: normal;
    font-size: 12px;
    color: var(--nd-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 17px;
    color: var(--nd-ink);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  small {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: var(--nd-muted);
    line-height: 1.3;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    font-size: 18px;

    &.is-green {
      background: #e8f4ec;
      color: #2e7d5a;
    }
    &.is-blue {
      background: #e8f0ff;
      color: #3b82f6;
    }
    &.is-purple {
      background: #f0e8ff;
      color: #7c3aed;
    }
    &.is-orange {
      background: #fff3e8;
      color: #ea580c;
    }
    &.is-cyan {
      background: #e8f7fa;
      color: #0891b2;
    }
    &.is-indigo {
      background: #e8ecff;
      color: #4f46e5;
    }
    &.is-amber {
      background: #fff4e5;
      color: #d97706;
    }
  }
}

.nd-preview-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.nd-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #edf2ee;
    text-align: left;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f7faf8;
    font-size: 12px;
    font-weight: 600;
    color: #6b7f74;
    white-space: nowrap;
  }

  .is-num {
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .is-qty {
    min-width: 96px;
  }

  .is-wage {
    color: #c2410c;
    font-weight: 600;
  }

  .is-op {
    width: 56px;
    text-align: center;
  }

  &__group td {
    padding: 0;
    background: #f7faf8;
    border-bottom: 1px solid #dce8e0;
  }

  &__empty {
    padding: 24px 12px;
    text-align: center;
  }
}

.nd-preview-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;

  &__main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    b {
      color: var(--nd-green);
      font-size: 14px;
    }

    span {
      color: var(--nd-muted);
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__sub {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--nd-muted);
    font-variant-numeric: tabular-nums;

    em {
      margin-left: 10px;
      font-style: normal;
      color: var(--nd-green);
      font-weight: 600;
    }

    strong {
      margin-left: 10px;
      color: #c2410c;
      font-weight: 700;
    }
  }
}

.nd-preview-prc b {
  font-weight: 600;
  color: var(--nd-ink);
}

.nd-preview-qty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 108px;
  max-width: 132px;

  span {
    font-size: 11px;
    color: var(--nd-muted);
    font-variant-numeric: tabular-nums;
  }

  :deep(.el-progress-bar__outer) {
    border-radius: 6px;
  }

  :deep(.el-progress-bar__inner) {
    border-radius: 6px;
  }
}

.nd-preview-workers {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 160px;
}

.nd-preview-worker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  background: #e8f4ec;
  border: 1px solid #c5dfd0;
  font-size: 13px;
  box-shadow: 0 1px 2px rgb(46 125 90 / 8%);

  :deep(.el-avatar) {
    font-size: 14px;
    font-weight: 700;
    background: #e3f1ea;
    color: #1f6b47;
  }

  em {
    font-style: normal;
    font-size: 13px;
    font-weight: 600;
    color: var(--nd-ink);
  }

  b {
    color: var(--nd-green);
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

.nd-preview-worker-add {
  width: 30px;
  height: 30px;
  border: 1px dashed #9dceb3;
  border-radius: 50%;
  background: #fff;
  color: var(--nd-green);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1;
}

.nd-preview-filter {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    strong {
      font-size: 14px;
      color: var(--nd-ink);
    }
  }

  &__foot {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #edf2ee;
    font-size: 12px;
    color: var(--nd-muted);
    text-align: right;
  }

  :deep(.el-select) {
    width: 100%;
  }
}

.nd-preview-filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--nd-green);
  color: #fff;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  line-height: 1;
}

.nd-smart-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nd-muted);
  line-height: 1.5;
}

.nd-smart-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 240px;
  overflow: auto;

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    padding: 8px 10px;
    margin-bottom: 6px;
    border: 1px solid #dce8e0;
    border-radius: 8px;
    background: #f7fbf8;

    b {
      font-size: 13px;
      color: var(--nd-ink);
    }

    span {
      font-size: 12px;
      color: #8a9b90;
      justify-self: end;
    }

    em {
      grid-column: 1 / -1;
      font-style: normal;
      font-size: 12px;
      color: var(--nd-muted);
    }

    small {
      grid-column: 1 / -1;
      color: var(--nd-green);
      font-size: 12px;
    }
  }
}

@media (max-width: 1100px) {
  .nd-step--pick,
  .nd-step--assign {
    grid-template-columns: 1fr;
  }

  .nd-preview__kpi {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .nd-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
