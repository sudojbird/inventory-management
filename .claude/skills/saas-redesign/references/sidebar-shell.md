# Sidebar shell reference

Markup and CSS for the two-column SaaS shell. Hand this to `vue-expert` as the spec —
it is a starting point to adapt to the app's actual routes and i18n setup, not a
drop-in file.

## Structure

```
.app-shell (grid: [sidebar] [content])
├── AppSidebar.vue          fixed, full height
│   ├── .sidebar-brand      logo + collapse toggle
│   ├── .sidebar-nav        grouped sections of router-links
│   └── .sidebar-footer     user/profile menu, language switcher
└── .content-column
    ├── .topbar             sticky, page title + right-side actions
    ├── FilterBar           sticky under topbar
    └── main.page-body      <router-view />
```

## AppSidebar.vue

```vue
<template>
  <aside class="sidebar" :class="{ collapsed, open: mobileOpen }">
    <div class="sidebar-brand">
      <router-link to="/" class="brand-mark">
        <span class="brand-glyph">FI</span>
        <span v-if="!collapsed" class="brand-text">{{ t('nav.companyName') }}</span>
      </router-link>
      <button
        class="collapse-btn"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path :d="collapsed ? 'M7 4l6 6-6 6' : 'M13 4l-6 6 6 6'"
                fill="none" stroke="currentColor" stroke-width="1.75"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Main navigation">
      <div v-for="section in sections" :key="section.label" class="nav-section">
        <p v-if="!collapsed" class="nav-section-label">{{ t(section.label) }}</p>
        <router-link
          v-for="item in section.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : null"
          :title="collapsed ? t(item.label) : null"
        >
          <span class="nav-icon" v-html="item.icon" aria-hidden="true"></span>
          <span v-if="!collapsed" class="nav-label">{{ t(item.label) }}</span>
        </router-link>
      </div>
    </nav>

    <div class="sidebar-footer">
      <!-- ProfileMenu / LanguageSwitcher, compact variants -->
    </div>
  </aside>
</template>
```

Setup notes:

- `collapsed` is a `ref` seeded from `localStorage.getItem('sidebar-collapsed') === 'true'`,
  written back in `toggleCollapse`. Wrap both in try/catch — storage throws in some
  privacy modes.
- `isActive(path)` must handle the root route exactly and others by prefix, so nested
  paths still highlight their parent:
  ```js
  const isActive = (path) =>
    path === '/' ? route.path === '/' : route.path.startsWith(path)
  ```
- `v-html` on icons is safe here only because the icon strings are hardcoded constants in
  this file. Never feed it API data.

## Nav sections

Group rather than listing flat. For this app:

| Section | Items |
|---|---|
| *(no label)* | Overview `/` |
| Operations | Inventory `/inventory`, Orders `/orders`, Demand `/demand` |
| Insights | Finance `/spending`, Reports `/reports` |

Icons are 18×18 inline SVG, `stroke="currentColor"`, `fill="none"`, `stroke-width="1.5"`,
so they inherit the active/inactive text color. Suggested glyphs: grid (overview), box
(inventory), clipboard (orders), trend-line (demand), currency (finance), document
(reports). No emojis.

## Root component shell

```vue
<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <AppSidebar />
    <div class="content-column">
      <header class="topbar">
        <h1 class="topbar-title">{{ currentPageTitle }}</h1>
        <div class="topbar-actions">
          <LanguageSwitcher />
          <ProfileMenu ... />
        </div>
      </header>
      <FilterBar />
      <main class="page-body">
        <router-view />
      </main>
    </div>
  </div>
</template>
```

`currentPageTitle` is a computed lookup from `route.path` into the same nav config the
sidebar uses — export the config from one module so the two never drift.

## Shell CSS

Goes in the root component's unscoped `<style>` block, after `tokens.css` is imported.

```css
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  transition: grid-template-columns var(--transition);
}

.app-shell.sidebar-collapsed {
  grid-template-columns: var(--sidebar-width-collapsed) 1fr;
}

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

.sidebar.collapsed { width: var(--sidebar-width-collapsed); }

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  height: var(--topbar-height);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--sidebar-border);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
}

.nav-section + .nav-section { margin-top: var(--space-6); }

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
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
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

/* Left accent marker, not a bottom border — reads correctly in a vertical rail. */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 20px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-accent);
}

.nav-item { position: relative; }

.nav-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.sidebar.collapsed .nav-item { justify-content: center; padding: var(--space-2); }

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--sidebar-border);
}

/* Content column is offset by the fixed sidebar via the grid track. */
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

.topbar-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.page-body {
  flex: 1;
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-6);
}
```

## Responsive

```css
/* Icon rail */
@media (max-width: 1280px) {
  .app-shell { grid-template-columns: var(--sidebar-width-collapsed) 1fr; }
  .sidebar { width: var(--sidebar-width-collapsed); }
  .sidebar .nav-label,
  .sidebar .nav-section-label,
  .sidebar .brand-text { display: none; }
}

/* Off-canvas drawer */
@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; }
  .content-column { grid-column: 1; }
  .sidebar {
    width: var(--sidebar-width);
    transform: translateX(-100%);
    transition: transform var(--transition);
  }
  .sidebar.open { transform: translateX(0); box-shadow: var(--shadow-lg); }
  .sidebar .nav-label,
  .sidebar .nav-section-label,
  .sidebar .brand-text { display: revert; }
  .page-body { padding: var(--space-4); }
}
```

Below 900px the topbar needs a hamburger button that toggles `mobileOpen`, plus a
click-catching backdrop and `Escape` to close. Close the drawer on route change —
otherwise it stays open over the new page.
