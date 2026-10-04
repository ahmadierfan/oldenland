# OLDENLAND — oldenland.com

A cinematic, scroll-driven website for Oldenland, an exporter of Persian saffron.
It follows the saffron from the field to the finished gift.

| Chapter | What happens on scroll | Tech |
|---|---|---|
| Hero · I The Field · II The Harvest | A real-time 3D saffron field at dawn. The camera flies down to a single crocus, its petals open, and its three red stigmas float out. | Three.js / React Three Fiber, custom shaders (sky, soil, wind) |
| III The Packaging | The packaging is modelled in 3D from the reference photos and opens layer by layer: the kraft bag, the gift box with its die-cut emblem, the violet case, the story card, the glass crocus stopper, and finally the vessel of saffron. | React Three Fiber, physical glass materials, bloom |
| IV The Saffron | The title reveals over a crimson glow, followed by the product specification. | GSAP timeline |
| V Export | A dotted globe turns as saffron threads leave Khorasan as glowing routes to each market. The cities light up as the routes arrive. Edit the markets in `lib/content.ts`. | React Three Fiber, custom shaders, bloom |
| VI Partnership · Contact | Importer information and a quote-request form (opens the visitor's email app). | — |

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

The globe's land dots are precomputed from Natural Earth data (the `world-atlas` package):

```bash
node scripts/build-world-dots.mjs   # writes public/data/world-dots.json
```

### Realism

`lib/realism.ts` and `components/CinematicFX.tsx` hold the "shot on a real camera" finish:
- Image-based lighting from real HDRIs (`public/hdri`: a studio for the unboxing, a sunrise for the field). They are loaded at full precision with the hottest pixels clamped.
- Tileable surface normals (`public/textures/normals`) for paper fibre, crumpled bag paper, foam and cracked soil.
- AgX filmic tone mapping, soft shadows, ambient occlusion (N8AO), depth of field that follows the camera's subject, bloom and a lens vignette.
- Film grain is a CSS layer over the page, not a post-processing pass. A soft-light grain pass on HDR values leaves black specks on glass highlights.

The HDRIs and normal maps are CC0 (Poly Haven, via `@pmndrs/assets`). See the `LICENSE.txt` next to them.

Model sizes, timings and camera moves are in:
- `lib/packaging.ts`: geometry, sizes and textures
- `components/PackagingScene.tsx`: the scroll timeline (`T`) and the camera path (`CAM`)

## Editing text

All copy is in `lib/content.ts`, including the story beats, unboxing captions, specs, export points and contact details.

**Check before going live:**
- `brand.email` is a placeholder (`info@oldenland.com`).
- The `specs` values (cut and grade, ISO 3632) should match your lab reports.
