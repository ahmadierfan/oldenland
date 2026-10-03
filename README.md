# OLDENLAND — oldenland.com

A cinematic, scroll-driven website for Oldenland, an exporter of Persian saffron.
It follows the saffron from the field to the finished gift.

| Chapter | What happens on scroll | Tech |
|---|---|---|
| Hero · I The Field · II The Harvest | A real-time 3D saffron field at dawn. The camera flies down to a single crocus, its petals open, and its three red stigmas float out. | Three.js / React Three Fiber, custom shaders (sky, soil, wind) |
| III The Packaging | The packaging is modelled in 3D from the reference photos and opens layer by layer: the kraft bag, the gift box with its die-cut emblem, the violet case, the story card, the glass crocus stopper, and finally the vessel of saffron. | React Three Fiber, physical glass materials, bloom |
| IV The Saffron | The title reveals over a crimson glow, followed by the product specification. | GSAP timeline |
| V Export · Contact | Importer information and a quote-request form (opens the visitor's email app). | — |

Stack: **Next.js 16** (static export), **TypeScript**, **Tailwind CSS v4**, **GSAP + ScrollTrigger**, **Lenis** smooth scroll, **Three.js / React Three Fiber**.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out — deploy to any static host (Vercel, Netlify, Cloudflare Pages, S3…)
```

## Reference media and textures

`media/source/` holds the original photos and the unboxing video. They are **reference only** and are not shown on the site.
The 3D scene uses two textures built from them:

```bash
bash scripts/build-textures.sh   # needs ImageMagick and potrace
```

This writes:
- `public/textures/kraft.jpg`: the kraft paper from the gift-box lid, with the lighting flattened.
- `public/textures/emblem.svg`: the vectorised die-cut emblem and wordmark.

Model sizes, timings and camera moves are in:
- `lib/packaging.ts`: geometry, sizes and textures
- `components/PackagingScene.tsx`: the scroll timeline (`T`) and the camera path (`CAM`)

## Editing text

All copy is in `lib/content.ts`, including the story beats, unboxing captions, specs, export points and contact details.

**Check before going live:**
- `brand.email` is a placeholder (`info@oldenland.com`).
- The `specs` values (cut and grade, ISO 3632) should match your lab reports.
