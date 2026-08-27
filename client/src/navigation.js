// Single source of truth for the sidebar nav structure and the topbar page
// title lookup. AppSidebar.vue and App.vue both import from here so the two
// never drift out of sync.

// Icons are 18x18 inline SVG strings (fill="none", stroke="currentColor") so
// they inherit the sidebar's active/inactive text color. They are hardcoded
// constants below, not API data, so using v-html with them is safe.
const ICONS = {
  grid: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="10" y="2" width="6" height="6" rx="1"/><rect x="2" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/></svg>',
  box: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5.5L9 2l7 3.5v7L9 16l-7-3.5v-7z" stroke-linejoin="round"/><path d="M2 5.5L9 9l7-3.5" stroke-linejoin="round"/><path d="M9 9v7"/></svg>',
  clipboard: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="10" height="13" rx="1.5"/><path d="M7 3V2.5a1 1 0 011-1h2a1 1 0 011 1V3"/><path d="M6.5 8h5M6.5 11h5" stroke-linecap="round"/></svg>',
  trend: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 13l4.5-5 3 3L16 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.5 4H16v4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  currency: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="7"/><path d="M9 5.5v7M11 7.25c0-.97-.9-1.75-2-1.75s-2 .78-2 1.75.9 1.5 2 1.5 2 .53 2 1.5-.9 1.75-2 1.75-2-.78-2-1.75" stroke-linecap="round"/></svg>',
  restock: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15.5 8.5A6.5 6.5 0 004 4.2" stroke-linecap="round"/><path d="M2.5 9.5A6.5 6.5 0 0014 13.8" stroke-linecap="round"/><path d="M3.6 1.6v2.9h2.9M14.4 16.4v-2.9h-2.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  document: '<svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 2h5l3 3v11H5V2z" stroke-linejoin="round"/><path d="M10 2v3h3" stroke-linejoin="round"/><path d="M7 9h4M7 12h4" stroke-linecap="round"/></svg>'
}

// `label` on a section is an i18n key, or null to render no section header
// (used for the root-level Overview link).
export const navSections = [
  {
    label: null,
    items: [
      { path: '/', label: 'nav.overview', icon: ICONS.grid }
    ]
  },
  {
    label: 'nav.sections.operations',
    items: [
      { path: '/inventory', label: 'nav.inventory', icon: ICONS.box },
      { path: '/orders', label: 'nav.orders', icon: ICONS.clipboard },
      { path: '/restocking', label: 'nav.restocking', icon: ICONS.restock },
      { path: '/demand', label: 'nav.demandForecast', icon: ICONS.trend }
    ]
  },
  {
    label: 'nav.sections.insights',
    items: [
      { path: '/spending', label: 'nav.finance', icon: ICONS.currency },
      { path: '/reports', label: 'nav.reports', icon: ICONS.document }
    ]
  }
]

// Flat list, convenient for route path -> title lookups in the topbar.
export const navItems = navSections.flatMap((section) => section.items)

// Root route matches exactly; every other route matches by prefix so nested
// paths (if any are added later) still highlight their parent nav item.
export const isActivePath = (routePath, itemPath) =>
  itemPath === '/' ? routePath === '/' : routePath.startsWith(itemPath)
