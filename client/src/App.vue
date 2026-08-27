<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <AppSidebar />

    <div class="content-column">
      <header class="topbar">
        <div class="topbar-left">
          <!-- Hamburger only rendered/visible below the 900px breakpoint (see CSS) -->
          <button
            class="mobile-menu-btn"
            :aria-label="mobileOpen ? t('nav.sidebar.closeMenu') : t('nav.sidebar.openMenu')"
            @click="toggleMobile"
          >
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          </button>
          <h1 class="topbar-title">{{ currentPageTitle }}</h1>
        </div>
        <div class="topbar-actions">
          <LanguageSwitcher />
          <ProfileMenu
            @show-profile-details="showProfileDetails = true"
            @show-tasks="showTasks = true"
          />
        </div>
      </header>
      <FilterBar />
      <main class="page-body">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useSidebar } from './composables/useSidebar'
import { navItems, isActivePath } from './navigation'
import AppSidebar from './components/AppSidebar.vue'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    AppSidebar,
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const route = useRoute()
    const { collapsed, mobileOpen, toggleMobile } = useSidebar()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    // Topbar page title: look up the current route in the shared nav config
    // so it can never drift from the sidebar's labels.
    const currentPageTitle = computed(() => {
      const match = navItems.find((item) => isActivePath(route.path, item.path))
      return match ? t(match.label) : ''
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      collapsed,
      mobileOpen,
      toggleMobile,
      currentPageTitle,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
/* Base reset, body, page-header, card, table, badge, loading/error styles
   now live in styles/tokens.css (imported first in main.js). Only the shell
   layout for the sidebar + topbar lives here. */

.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  transition: grid-template-columns var(--transition);
}

.app-shell.sidebar-collapsed {
  grid-template-columns: var(--sidebar-width-collapsed) 1fr;
}

/* --- Sidebar (AppSidebar.vue's root elements) --- */

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  transition: width var(--transition);
  z-index: 50;
}

.sidebar.collapsed {
  width: var(--sidebar-width-collapsed);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  height: var(--topbar-height);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--sidebar-border);
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  text-decoration: none;
  color: var(--sidebar-text-active);
}

.brand-glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
}

.brand-text {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--sidebar-text);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.collapse-btn:hover {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

.sidebar.collapsed .collapse-btn {
  display: none;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
}

.nav-section + .nav-section {
  margin-top: var(--space-6);
}

.nav-section-label {
  font-size: 11px;
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-muted);
  padding: 0 var(--space-3);
  margin-bottom: var(--space-2);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
  border-radius: var(--radius);
  color: var(--sidebar-text);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  text-decoration: none;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.nav-item:hover {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

.nav-item.active {
  background: var(--sidebar-item-active);
  color: var(--sidebar-text-active);
}

/* Left accent marker, not a bottom border - reads correctly in a vertical rail. */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 20px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-accent);
}

.nav-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--space-2);
}

/* Click-catching overlay behind the off-canvas drawer (mobile only) */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 45;
}

/* --- Content column --- */

.content-column {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-width: 0; /* lets wide tables scroll instead of blowing out the grid */
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--topbar-height);
  padding: 0 var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1 1 auto;
}

.topbar-title {
  min-width: 0;
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

/* Hamburger is only shown on the off-canvas breakpoint, see media query below */
.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.mobile-menu-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.page-body {
  flex: 1;
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-6);
}

/* --- Responsive --- */

/* Icon rail */
@media (max-width: 1280px) {
  .app-shell {
    grid-template-columns: var(--sidebar-width-collapsed) 1fr;
  }
  .sidebar {
    width: var(--sidebar-width-collapsed);
  }
  .sidebar .nav-label,
  .sidebar .nav-section-label,
  .sidebar .brand-text {
    display: none;
  }
  .sidebar .collapse-btn {
    display: none;
  }
}

/* Off-canvas drawer.
   Selectors below repeat the ".sidebar-collapsed"/".collapsed" variants at
   matching specificity - otherwise the desktop collapsed-state rules (which
   use two classes) would keep winning over the plain ".app-shell"/".sidebar"
   rules here even though this media query comes later in the stylesheet.
   The collapse toggle is hidden on mobile, so the drawer should always
   render at full width regardless of whatever collapsed state was
   persisted from a wider viewport. */
@media (max-width: 900px) {
  .app-shell,
  .app-shell.sidebar-collapsed {
    grid-template-columns: 1fr;
  }
  .content-column {
    grid-column: 1;
  }
  .sidebar,
  .sidebar.collapsed {
    width: var(--sidebar-width);
    transform: translateX(-100%);
    transition: transform var(--transition);
  }
  .sidebar.open {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }
  .sidebar .nav-label,
  .sidebar .nav-section-label,
  .sidebar .brand-text {
    display: revert;
  }
  .sidebar .collapse-btn {
    display: none;
  }
  .sidebar.collapsed .nav-item {
    justify-content: flex-start;
    padding: var(--space-2) var(--space-3);
  }
  .mobile-menu-btn {
    display: inline-flex;
  }
  .page-body {
    padding: var(--space-4);
  }
}
</style>
