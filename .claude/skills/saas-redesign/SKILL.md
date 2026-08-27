---
name: saas-redesign
description: Redesign a Vue 3 app's UI into a modern SaaS interface - replace a top nav bar with a vertical left sidebar, install a design token system, and normalize spacing/typography/surfaces across every view. Use when asked to modernize, restyle, or redesign the frontend, move navigation to a sidebar, make the UI look polished or professional, or apply consistent spacing across pages.
---

# SaaS UI Redesign

Converts a Vue 3 app from a top-nav layout to a modern SaaS shell: persistent left sidebar,
token-driven styling, and one consistent spacing/typography scale across every view.

This is a **restyle, not a rewrite**. Component logic, props, API calls, computed properties,
and router config stay untouched unless the layout change strictly requires it.

## Non-negotiables

- **Delegate every `.vue` file create/modify to the `vue-expert` subagent** (project rule in CLAUDE.md).
  This skill is the plan; vue-expert executes the file edits.
- **Verify in a real browser with Playwright MCP tools** before declaring done. Screenshots at
  1440px, 1100px, and 800px wide, on every route.
- **No emojis in the UI.** Navigation icons are inline SVG (see `references/sidebar-shell.md`).
- **Do not change behavior.** If a redesign step would alter data flow, filters, or routes, stop
  and flag it instead of doing it silently.

## Workflow

Work through these phases in order. Do not skip the audit — it's what keeps the sweep bounded.

### Phase 1 — Audit

Build a picture of what exists before touching anything.

```bash
# Route list and nav labels
cat client/src/main.js
# Global styles live in the root component's unscoped <style> block
grep -n "<style" client/src/App.vue
# How much hardcoded color is out there? This number sizes Phase 4.
grep -rEoh "#[0-9a-fA-F]{3,8}" client/src --include='*.vue' | sort | uniq -c | sort -rn
# Hardcoded spacing values
grep -rEoh "(padding|margin|gap): *[0-9.]+rem" client/src --include='*.vue' | sort | uniq -c | sort -rn
```

Record: the route→label map, which components own global CSS, the top ~10 colors, and the
spacing values actually in use. The most-used colors become token values — you are *naming*
the existing palette, not replacing it.

### Phase 2 — Install design tokens

Copy `references/design-tokens.css` to `client/src/styles/tokens.css` and import it first in
`client/src/main.js`:

```js
import './styles/tokens.css'
```

Import order matters — tokens must land before component styles so `:root` vars resolve everywhere.

Then reconcile the token values against the Phase 1 audit. Keep the app's existing hues; the
tokens exist to make spacing and elevation consistent, not to rebrand. Changing brand color is a
separate request — ask first.

### Phase 3 — Build the shell

The structural change. See `references/sidebar-shell.md` for the full component spec and markup.

1. Create `client/src/components/AppSidebar.vue` — nav sections, inline SVG icons, active-route
   highlight, collapse toggle persisted to `localStorage`.
2. Rewrite the root component's template as a two-column grid: sidebar + content column.
3. Move the user/profile menu and language switcher into a slim content-column topbar (or the
   sidebar footer). Delete the old `.top-nav` / `.nav-tabs` CSS — leaving it behind is the most
   common source of a broken-looking result.
4. Reflow the filter bar as a sticky toolbar inside the content column, below the topbar.

Group nav items rather than listing them flat. A good default grouping for an operations app:
overview alone at top, then transactional views, then analytics/reporting. Section labels are
uppercase, 11px, `--color-text-muted`.

### Phase 4 — Sweep the views

One view per pass, committing coherent chunks. For each `.vue` file, hand vue-expert a scoped
brief: replace hardcoded hex with tokens, replace ad-hoc spacing with the scale, and apply the
shared surface classes (`.card`, `.stat-card`, `.page-header`) instead of bespoke per-view
variants.

Priorities, in order:
1. **Page headers** — every view opens with the same `.page-header` block at the same rhythm.
2. **Cards and surfaces** — one radius, one border, one shadow. No view-local overrides.
3. **Tables** — shared header treatment, row padding, hover state.
4. **Charts** — map series colors to `--chart-1`…`--chart-6` in order; keep the existing
   SVG structure and series identity.

Resist redesigning data visualizations here. Recoloring to tokens is in scope; changing chart
types is not.

### Phase 5 — Verify

With the app running (`/start` skill), drive Playwright over every route:

- Screenshot each route at 1440 / 1100 / 800 px.
- Confirm the active nav item matches the current route on each one.
- Toggle sidebar collapse, navigate, confirm the state persists.
- Check the browser console for errors on each route.

Then read the checklist below and fix what fails.

## Layout spec

| Element | Value |
|---|---|
| Sidebar width, expanded | 260px |
| Sidebar width, collapsed | 68px |
| Topbar height | 56px |
| Content max width | 1440px, centered, `--space-6` gutters |
| Sidebar breakpoint → icon rail | 1280px |
| Sidebar breakpoint → off-canvas drawer | 900px |

Spacing uses a 4px base scale (`--space-1` … `--space-10`). Every margin, padding, and gap in
the redesigned UI must come from that scale — that consistency *is* the polish. Two values doing
the same job (`1.25rem` here, `1.5rem` there) is the single most common reason a UI reads as
unpolished.

## Checklist

Run through this before reporting done:

- [ ] Old top-nav markup **and** its CSS are gone, not just hidden
- [ ] Active route highlights correctly on every route, including nested paths
- [ ] Sidebar collapse persists across reloads and route changes
- [ ] Sidebar becomes a drawer below 900px with a working open/close control
- [ ] Every page header uses the same component/class and vertical rhythm
- [ ] All card surfaces share one radius, border, and shadow
- [ ] No hardcoded hex colors remain in view files (`grep` from Phase 1 returns only token defs)
- [ ] All spacing values come from the scale
- [ ] Focus rings visible on every interactive element (keyboard-tab the sidebar)
- [ ] Nav has `<nav aria-label>`; active link carries `aria-current="page"`
- [ ] No console errors on any route
- [ ] No emojis anywhere in the UI
- [ ] Existing tests still pass (`/test` skill)

## Scope boundaries

Ask before doing any of these — they are adjacent requests, not part of a redesign:

- Changing the brand/accent color
- Adding dark mode
- Adding, removing, or reordering routes
- Swapping chart types or restructuring data displays
- Introducing a UI component library or CSS framework
