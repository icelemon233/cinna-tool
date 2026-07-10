# Renderer Style Architecture

This project uses Tailwind CSS v4 through `@tailwindcss/vite`.

## Layout

- `shared/styles/global.css`: Tailwind import, base reset, theme variables, shared keyframes.
- `app/index.css`: app shell, sidebar, page-slot layout.
- `pages/<page>/index.tsx` + `pages/<page>/index.css`: page entry and page-level layout.
- `pages/<page>/components`: components that only belong to that page.
- `shared/components`: components reused across pages.

## Rules

- Prefer page co-location for page CSS. Tailwind does not require a separate
  `styles/` tree; this app keeps only global CSS here.
- Prefer `className` plus CSS files for layout, spacing, state, animation, and responsive rules.
- Put styles under `@layer components` unless they are global base rules.
- Keep React `style` only for runtime values that come from user data or measurement, such as wallpaper URLs, swatch colors, and virtual-list offsets.
- Use `pnpm` for dependency changes so `pnpm-lock.yaml` stays authoritative.
