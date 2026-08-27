<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Budget slider -->
      <div class="budget-panel">
        <div class="budget-heading">
          <div>
            <div class="stat-label">{{ t('restocking.budgetTitle') }}</div>
            <div class="budget-value">{{ money(budget) }}</div>
          </div>
          <div class="lead-time-note">{{ t('restocking.leadTimeNote', { days: LEAD_TIME_DAYS }) }}</div>
        </div>
        <input
          v-model.number="budget"
          class="budget-slider"
          type="range"
          :min="BUDGET_MIN"
          :max="BUDGET_MAX"
          :step="BUDGET_STEP"
          :aria-label="t('restocking.budgetTitle')"
        />
        <div class="budget-scale">
          <span>{{ money(BUDGET_MIN) }}</span>
          <span class="hint">{{ t('restocking.budgetHint') }}</span>
          <span>{{ money(BUDGET_MAX) }}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card warning">
          <div class="stat-label">{{ t('restocking.stats.itemsShort') }}</div>
          <div class="stat-value">{{ shortItems.length }}</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">{{ t('restocking.stats.totalNeed') }}</div>
          <div class="stat-value">{{ money(totalNeed) }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t('restocking.stats.budgetAllocated') }}</div>
          <div class="stat-value">{{ money(allocatedTotal) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('restocking.stats.itemsFunded') }}</div>
          <div class="stat-value">{{ fundedCount }} / {{ shortItems.length }}</div>
        </div>
      </div>

      <div v-if="lastOrder" class="submit-success">
        <span>
          {{ t('restocking.orderPlaced', {
            orderNumber: lastOrder.order_number,
            date: formatDate(lastOrder.expected_delivery)
          }) }}
        </span>
        <router-link to="/orders" class="success-link">{{ t('restocking.viewInOrders') }}</router-link>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">
            {{ t('restocking.recommendations') }} ({{ allocation.length }})
          </h3>
          <span v-if="adequateCount > 0" class="hint">
            {{ t('restocking.stats.adequatelyStocked') }}: {{ adequateCount }}
          </span>
        </div>

        <div v-if="candidates.length === 0" class="empty-note">
          {{ t('restocking.noForecastData') }}
        </div>
        <div v-else-if="shortItems.length === 0" class="empty-note success-note">
          {{ t('restocking.noneShort') }}
        </div>
        <template v-else>
          <div class="table-container">
            <table class="restock-table">
              <thead>
                <tr>
                  <th class="col-sku">{{ t('restocking.table.sku') }}</th>
                  <th class="col-name">{{ t('restocking.table.itemName') }}</th>
                  <th class="col-warehouse">{{ t('restocking.table.warehouse') }}</th>
                  <th class="col-num">{{ t('restocking.table.unitsShort') }}</th>
                  <th class="col-num">{{ t('restocking.table.orderQty') }}</th>
                  <th class="col-num">{{ t('restocking.table.unitCost') }}</th>
                  <th class="col-num">{{ t('restocking.table.lineTotal') }}</th>
                  <th class="col-status">{{ t('restocking.table.status') }}</th>
                  <th class="col-reason">{{ t('restocking.table.reason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in allocation"
                  :key="row.sku"
                  :class="{ 'row-unfunded': row.state === 'unfunded' }"
                >
                  <td class="col-sku"><strong>{{ row.sku }}</strong></td>
                  <td class="col-name">{{ translateProductName(row.name) }}</td>
                  <td class="col-warehouse">{{ translateWarehouse(row.warehouse) }}</td>
                  <td class="col-num">{{ row.shortfall.toLocaleString() }}</td>
                  <td class="col-num">
                    <strong v-if="row.orderQty > 0">{{ row.orderQty.toLocaleString() }}</strong>
                    <span v-else>&mdash;</span>
                  </td>
                  <td class="col-num">{{ moneyPrecise(row.unitCost) }}</td>
                  <td class="col-num">
                    <span v-if="row.lineTotal > 0">{{ money(row.lineTotal) }}</span>
                    <span v-else>&mdash;</span>
                  </td>
                  <td class="col-status">
                    <span :class="['badge', stateBadgeClass(row.state)]">
                      {{ t(`restocking.${row.state}`) }}
                    </span>
                  </td>
                  <td class="col-reason">
                    <span class="reason-text">{{ t('restocking.unitsShort', { count: row.shortfall }) }}</span>
                    <span v-if="row.state === 'partial'" class="reason-detail">
                      {{ t('restocking.partialDetail', { funded: row.orderQty, needed: row.shortfall }) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="order-footer">
            <div class="footer-notes">
              <div v-if="budget === 0" class="hint">{{ t('restocking.zeroBudget') }}</div>
              <div v-else-if="fundedCount === 0" class="hint">{{ t('restocking.budgetTooSmall') }}</div>
              <div v-else-if="allNeedsFunded" class="hint">
                {{ t('restocking.fullyFunded', { amount: money(unallocated) }) }}
              </div>
              <div v-else class="hint">
                {{ t('restocking.stats.unallocated') }}: {{ money(unallocated) }}
              </div>
            </div>
            <button
              class="btn-place-order"
              :disabled="orderLines.length === 0"
              @click="placeOrder"
            >
              {{ t('restocking.placeOrder') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'
import { useSubmittedOrders, LEAD_TIME_DAYS } from '../composables/useSubmittedOrders'
import { formatCurrency, formatCurrencyWithDecimals } from '../utils/currency'

// Fixed slider bounds. Funding every forecasted shortfall costs ~$66.8K, so the
// $100K ceiling leaves headroom to demonstrate the fully-funded state.
const BUDGET_MIN = 0
const BUDGET_MAX = 100000
const BUDGET_STEP = 1000
const BUDGET_DEFAULT = 30000

const round2 = (value) => Math.round(value * 100) / 100

export default {
  name: 'Restocking',
  setup() {
    const { t, currentLocale, currentCurrency, translateProductName, translateWarehouse } = useI18n()
    const { submitRestockOrder } = useSubmittedOrders()
    const {
      selectedLocation,
      selectedCategory,
      getCurrentFilters
    } = useFilters()

    const loading = ref(true)
    const error = ref(null)
    const allForecasts = ref([])
    const inventoryItems = ref([])
    const budget = ref(BUDGET_DEFAULT)
    const lastOrder = ref(null)

    // formatCurrency actually converts USD->JPY, unlike the currencySymbol
    // computed used by Orders.vue. A budget control must not misstate amounts.
    const money = (amount) => formatCurrency(amount, currentCurrency.value)
    const moneyPrecise = (amount) => formatCurrencyWithDecimals(amount, currentCurrency.value, 2)

    const loadRestockData = async () => {
      try {
        loading.value = true
        error.value = null
        const filters = getCurrentFilters()
        // /api/demand takes no query params, so the warehouse/category filters are
        // applied by intersecting forecast SKUs against filtered inventory below.
        const [forecastsData, inventoryData] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory({ warehouse: filters.warehouse, category: filters.category })
        ])
        allForecasts.value = forecastsData
        inventoryItems.value = inventoryData
      } catch (err) {
        error.value = 'Failed to load restocking data: ' + err.message
      } finally {
        loading.value = false
      }
    }

    // Join forecasts to inventory by SKU. A forecast with no matching inventory row
    // is uncostable and is dropped - this is also how the filters take effect.
    const candidates = computed(() => {
      const bySku = new Map()
      inventoryItems.value.forEach(item => {
        if (!bySku.has(item.sku)) bySku.set(item.sku, item)
      })

      return allForecasts.value.reduce((rows, forecast) => {
        const item = bySku.get(forecast.item_sku)
        if (!item) return rows
        const shortfall = forecast.forecasted_demand - item.quantity_on_hand
        rows.push({
          sku: item.sku,
          name: forecast.item_name,
          warehouse: item.warehouse,
          onHand: item.quantity_on_hand,
          forecast: forecast.forecasted_demand,
          unitCost: item.unit_cost,
          shortfall,
          fullCost: shortfall > 0 ? round2(shortfall * item.unit_cost) : 0
        })
        return rows
      }, [])
    })

    // Items already covered by stock (includes decreasing-trend items like MTR-304).
    // Excluded by shortfall alone, never by trend - a declining SKU can still be short.
    const adequateCount = computed(() => candidates.value.filter(c => c.shortfall <= 0).length)

    // Greedy by urgency: largest shortfall first, cheaper unit cost as tie-break,
    // then SKU so the order is deterministic across re-renders.
    const shortItems = computed(() =>
      candidates.value
        .filter(c => c.shortfall > 0)
        .sort((a, b) =>
          b.shortfall - a.shortfall ||
          a.unitCost - b.unitCost ||
          a.sku.localeCompare(b.sku)
        )
    )

    const totalNeed = computed(() => round2(shortItems.value.reduce((sum, i) => sum + i.fullCost, 0)))

    // Two passes. Pass 1 funds whole shortfalls, skipping any line that does not
    // fit so cheaper lines further down can still be covered. Pass 2 spends the
    // leftover on a partial quantity of the most urgent line pass 1 could not fit,
    // so the budget is not left idle.
    const allocation = computed(() => {
      let remaining = budget.value
      const rows = shortItems.value.map(item => ({
        ...item,
        orderQty: 0,
        lineTotal: 0,
        state: 'unfunded'
      }))

      rows.forEach(row => {
        if (row.fullCost > 0 && row.fullCost <= remaining) {
          row.orderQty = row.shortfall
          row.lineTotal = row.fullCost
          row.state = 'funded'
          remaining = round2(remaining - row.fullCost)
        }
      })

      const topUp = rows.find(row => row.state === 'unfunded' && Math.floor(remaining / row.unitCost) > 0)
      if (topUp) {
        topUp.orderQty = Math.floor(remaining / topUp.unitCost)
        topUp.lineTotal = round2(topUp.orderQty * topUp.unitCost)
        topUp.state = 'partial'
      }

      return rows
    })

    const allocatedTotal = computed(() => round2(allocation.value.reduce((sum, r) => sum + r.lineTotal, 0)))
    const unallocated = computed(() => round2(budget.value - allocatedTotal.value))
    const fundedCount = computed(() => allocation.value.filter(r => r.orderQty > 0).length)
    const allNeedsFunded = computed(() =>
      allocation.value.length > 0 && allocation.value.every(r => r.state === 'funded')
    )

    const orderLines = computed(() =>
      allocation.value
        .filter(row => row.orderQty > 0)
        .map(row => ({
          sku: row.sku,
          name: row.name,
          quantity: row.orderQty,
          unit_price: row.unitCost
        }))
    )

    const stateBadgeClass = (state) => {
      const map = { funded: 'success', partial: 'warning', unfunded: 'danger' }
      return map[state] || 'info'
    }

    const formatDate = (dateString) => {
      const locale = currentLocale.value === 'ja' ? 'ja-JP' : 'en-US'
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const placeOrder = () => {
      if (orderLines.value.length === 0) return
      lastOrder.value = submitRestockOrder({
        lines: orderLines.value,
        budget: budget.value,
        warehouse: selectedLocation.value,
        category: selectedCategory.value
      })
    }

    onMounted(loadRestockData)
    // Time Period and Order Status have no meaning for restocking and are ignored.
    watch([selectedLocation, selectedCategory], loadRestockData)

    return {
      t,
      loading,
      error,
      budget,
      BUDGET_MIN,
      BUDGET_MAX,
      BUDGET_STEP,
      LEAD_TIME_DAYS,
      candidates,
      shortItems,
      adequateCount,
      allocation,
      totalNeed,
      allocatedTotal,
      unallocated,
      fundedCount,
      allNeedsFunded,
      orderLines,
      lastOrder,
      placeOrder,
      stateBadgeClass,
      formatDate,
      money,
      moneyPrecise,
      translateProductName,
      translateWarehouse
    }
  }
}
</script>

<style scoped>
/* Budget panel */
.budget-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-sm);
}

.budget-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.budget-value {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
  line-height: var(--leading-tight);
}

.lead-time-note {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: right;
  max-width: 240px;
}

/* Range input built from scratch - no slider exists elsewhere in the app */
.budget-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
  margin: var(--space-1) 0;
}

.budget-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.budget-slider::-moz-range-track {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  margin-top: -7px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow);
  transition: background var(--transition-fast);
}

.budget-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  border: 2px solid var(--color-surface);
  box-shadow: var(--shadow);
}

.budget-slider:hover::-webkit-slider-thumb {
  background: var(--color-accent-hover);
}

.budget-slider:focus-visible {
  outline: none;
}

.budget-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--focus-ring);
}

.budget-scale {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: var(--weight-normal);
}

/* Recommendations table */
.restock-table {
  table-layout: fixed;
  width: 100%;
}

.col-sku {
  width: 100px;
}

.col-name {
  width: 200px;
}

.col-warehouse {
  width: 130px;
}

.col-num {
  width: 110px;
  text-align: right;
}

.col-status {
  width: 110px;
}

.col-reason {
  width: 200px;
}

/* Skipped lines read as skipped */
.row-unfunded {
  opacity: 0.55;
}

.reason-text {
  display: block;
  font-size: var(--text-base);
  color: var(--color-text);
}

.reason-detail {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-warning);
  margin-top: var(--space-1);
}

/* Empty states */
.empty-note {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--text-md);
}

.success-note {
  color: var(--color-success-text);
  background: var(--color-success-bg);
  border-radius: var(--radius-md);
}

/* Order footer */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.footer-notes {
  flex: 1;
}

.btn-place-order {
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast);
}

.btn-place-order:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-place-order:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-place-order:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Submission confirmation */
.submit-success {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  background: var(--color-success-bg);
  color: var(--color-success-text);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  margin-bottom: var(--space-5);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
}

.success-link {
  color: var(--color-success-text);
  font-weight: var(--weight-semibold);
  text-decoration: underline;
  white-space: nowrap;
}
</style>
