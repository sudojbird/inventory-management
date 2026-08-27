import { ref } from 'vue'

// Module-level (shared) state, same pattern as useI18n's currentLocale -
// AppSidebar.vue and App.vue both need to read/toggle the same collapse and
// mobile-drawer state without prop drilling.

const readCollapsed = () => {
  try {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  } catch {
    // Storage can throw in privacy modes (e.g. Safari private browsing) -
    // fall back to expanded.
    return false
  }
}

const collapsed = ref(readCollapsed())
// Off-canvas drawer state for viewports < 900px. Intentionally not
// persisted - it should always start closed on load.
const mobileOpen = ref(false)

export function useSidebar() {
  const toggleCollapse = () => {
    collapsed.value = !collapsed.value
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed.value))
    } catch {
      // ignore storage write errors
    }
  }

  const openMobile = () => { mobileOpen.value = true }
  const closeMobile = () => { mobileOpen.value = false }
  const toggleMobile = () => { mobileOpen.value = !mobileOpen.value }

  return { collapsed, mobileOpen, toggleCollapse, openMobile, closeMobile, toggleMobile }
}
