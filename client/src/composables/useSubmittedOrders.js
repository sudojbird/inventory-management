import { ref, computed } from 'vue'

// Fixed supplier lead time applied to every restock order. Matches the 7-14 day
// window used by generate_data.py when it builds the historical order data.
// Single source of truth for both Restocking.vue and the Orders tab.
export const LEAD_TIME_DAYS = 14

// Shared submitted-order state (singleton pattern, same as useFilters.js).
// CLIENT-SIDE ONLY: these orders are never sent to the API. They survive route
// changes because they live at module scope, but are lost on page refresh.
const submittedOrders = ref([])
let nextSequence = 1

// Local-time "YYYY-MM-DDTHH:MM:SS" to match every date string in orders.json.
// toISOString() is deliberately avoided: it emits UTC with a .000Z suffix, which
// would both break the format and shift the displayed date in western timezones.
const toIsoSeconds = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const round2 = (value) => Math.round(value * 100) / 100

export function useSubmittedOrders() {
  const submittedCount = computed(() => submittedOrders.value.length)

  // lines: [{ sku, name, quantity, unit_price }] - same shape as server Order.items
  const submitRestockOrder = ({ lines, budget, warehouse, category }) => {
    const now = new Date()
    const delivery = new Date(now.getTime() + LEAD_TIME_DAYS * 86400000)
    const sequence = nextSequence++

    const order = {
      // "restock-" prefix cannot collide with the existing numeric ids "1".."250"
      id: `restock-${sequence}`,
      // "RST-" prefix cannot collide with the existing ORD-2025-#### numbers
      order_number: `RST-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`,
      customer: 'Internal Restock',
      items: lines,
      status: 'Submitted',
      order_date: toIsoSeconds(now),
      expected_delivery: toIsoSeconds(delivery),
      total_value: round2(lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)),
      warehouse: warehouse && warehouse !== 'all' ? warehouse : 'All Warehouses',
      category: category && category !== 'all' ? category : 'All Categories',
      // Extra fields beyond the server Order model, used by the Orders tab
      lead_time_days: LEAD_TIME_DAYS,
      budget
    }

    submittedOrders.value.unshift(order)
    return order
  }

  const clearSubmittedOrders = () => {
    submittedOrders.value = []
  }

  return {
    submittedOrders,
    submittedCount,
    submitRestockOrder,
    clearSubmittedOrders,
    LEAD_TIME_DAYS
  }
}
