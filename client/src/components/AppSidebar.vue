<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useSidebar } from '../composables/useSidebar'
import { navSections, isActivePath } from '../navigation'

const route = useRoute()
const { t } = useI18n()
const { collapsed, mobileOpen, toggleCollapse, closeMobile } = useSidebar()

// The desktop "collapsed" preference is persisted independently of the
// mobile drawer. Without this, a collapsed desktop sidebar would still
// render icon-only inside the off-canvas drawer, and CSS alone can't
// recover labels that v-if already removed from the DOM.
const isCollapsed = computed(() => collapsed.value && !mobileOpen.value)

const isActive = (path) => isActivePath(route.path, path)

// The off-canvas drawer must close on navigation, otherwise it stays open
// over the newly-routed page on small viewports.
watch(() => route.path, () => closeMobile())

const handleKeydown = (event) => {
  if (event.key === 'Escape' && mobileOpen.value) {
    closeMobile()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!-- Click-catching backdrop, only present while the mobile drawer is open -->
  <div v-if="mobileOpen" class="sidebar-backdrop" @click="closeMobile"></div>

  <aside class="sidebar" :class="{ collapsed: isCollapsed, open: mobileOpen }">
    <div class="sidebar-brand">
      <router-link to="/" class="brand-mark">
        <span class="brand-glyph">CC</span>
        <span v-if="!isCollapsed" class="brand-text">{{ t('nav.companyName') }}</span>
      </router-link>
      <button
        class="collapse-btn"
        :aria-label="collapsed ? t('nav.sidebar.expand') : t('nav.sidebar.collapse')"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            :d="collapsed ? 'M7 4l6 6-6 6' : 'M13 4l-6 6 6 6'"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Main navigation">
      <div v-for="section in navSections" :key="section.label || 'root'" class="nav-section">
        <p v-if="!isCollapsed && section.label" class="nav-section-label">{{ t(section.label) }}</p>
        <router-link
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : null"
          :title="isCollapsed ? t(item.label) : null"
        >
          <!-- Icons are hardcoded constants from navigation.js, never API data -->
          <span class="nav-icon" v-html="item.icon" aria-hidden="true"></span>
          <span v-if="!isCollapsed" class="nav-label">{{ t(item.label) }}</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>
