# Refactoring UI — Personal Knowledge Base
*Based on Refactoring UI by Adam Wathan & Steve Schoger (full package)*
*Last updated: 2026-03-05 (book PDF fully incorporated)*

---

## Table of Contents
1. [Core Design Philosophy](#core-design-philosophy)
2. [Typography](#typography)
3. [Color](#color)
4. [Spacing & Layout](#spacing--layout)
5. [Visual Hierarchy](#visual-hierarchy)
6. [Shadows & Depth](#shadows--depth)
7. [Buttons](#buttons)
8. [Form Inputs](#form-inputs)
9. [Input Groups](#input-groups)
10. [Error Validation Patterns](#error-validation-patterns)
11. [Badges](#badges)
12. [Navigation Patterns](#navigation-patterns)
13. [Tables](#tables)
14. [Cards & Preview Components](#cards--preview-components)
15. [Modals](#modals)
16. [Alerts](#alerts)
17. [Pagination](#pagination)
18. [Breadcrumbs](#breadcrumbs)
19. [Activity Feeds](#activity-feeds)
20. [Page-Level Patterns](#page-level-patterns)
21. [Icons](#icons)
22. [Working with Images](#working-with-images)
23. [Finishing Touches](#finishing-touches)
24. [Leveling Up](#leveling-up)
25. [Quick Reference: Decision Rules](#quick-reference-decision-rules)

---

## Core Design Philosophy

### Start with a feature, not a layout
Don't begin by designing the nav or shell. You don't have enough information yet. Start with a real piece of functionality (e.g., "search for a flight") and design that. The navigation will reveal itself once you've designed several features.

### Design in grayscale first
Force yourself to establish hierarchy through spacing, sizing, and weight before adding color. Color added later will feel intentional rather than decorative.

### Don't design too much upfront
Work in short cycles. Design a simple version → build it → iterate on the working thing. Don't try to solve every edge case in advance; it's much easier to fix design problems in an interface you can actually use. Be a pessimist: if a feature is a "nice-to-have", design it later. Design the smallest useful version first so you always have something shippable.

### Limit your choices with a system
Decision fatigue kills good design. Pre-define a spacing scale, type scale, color palette, and shadow scale. Then only pick from those values. This is the single biggest habit change for developers learning design.

Systematize: font size, font weight, line height, color, margin, padding, width, height, box shadows, border radius, border width, opacity. You don't need to define all of this upfront — just avoid making the same minor decision twice.

### Design the personality consciously
Every design has a personality. The main levers are:
- **Font:** Serif → classic/editorial; rounded sans → playful; neutral sans → clean/professional
- **Color:** Blue = safe/familiar; gold = expensive; pink = fun. Match the emotion, not just the brand.
- **Border radius:** Large = playful; small = neutral; none = serious/formal. Stay consistent — mixing is worse than either extreme.
- **Language/copy:** Words are everywhere in UI. Formal vs. casual tone has as much impact as visual choices.

### Every design decision should serve communication
Ask: "Does this make the content clearer?" If not, remove it.

### Start with too much whitespace, then remove it
Cramped UIs look amateur. Default to generous padding, then tighten as needed — never the reverse.

---

## Typography

### Type Scale
Use a **hand-crafted scale** — don't pick font sizes ad hoc, and don't rely purely on a mathematical modular scale (those produce fractional values and too few useful stops). A practical starting set that aligns with a 4/8px spacing system:
- 12px, 14px, 16px, 18px, 20px, 24px, 30px, 36px, 48px, 60px, 72px

**Why not modular scales?** A 3:4 ratio gives 12px → 16px → 21px → 28px — you'll immediately want something between each step. Hand-pick instead.

**Use px or rem, never em for your type scale.** `em` values are relative to the current font size; nested elements compute to off-scale values. `1.25em` inside a `20px` element renders at `25px`, not a value in your scale.

### Font Weight
- Use **2 weights max** in most UIs: regular (400 or 500) and semibold/bold (600–700)
- **Avoid weights under 400** for UI work — use a lighter color or smaller size to de-emphasize instead
- Light weights (300) can work for large display headings but are too hard to read at body sizes

### How to Pick a Good Font
- **Filter for 5+ weights** — fonts with many weights are crafted with more care. On Google Fonts, filtering for 10+ styles (to include italics) cuts ~85% of options.
- **Optimize for legibility at your use size** — headline fonts have tighter letter-spacing and shorter x-heights; UI fonts have wider letter-spacing and taller x-heights. Don't use condensed/headline fonts for body copy.
- **Trust the crowd** — sort by popularity; popular fonts are popular because they're good.
- **Steal from sites you admire** — inspect their font choices; design-focused teams make strong typography decisions.
- **Safe default:** neutral sans-serif, e.g., system font stack: `-apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue`

### Line Height
Line-height is **proportional to both line length and font size** — not a single fixed value.

- **Narrow content / short lines:** 1.5 is fine
- **Wide content / long lines:** up to 1.8–2 (eyes need more help finding the next line)
- **Large display/headline text:** 1.0–1.2 (eyes don't need help at big sizes)
- **Single-line UI labels:** 1 or close to it

Rule of thumb: line-height and font size are **inversely proportional** — larger text needs less line height, smaller text needs more.

### Line Length
- **Optimal:** 45–75 characters per line (book says 45–75, not 60–75)
- Use `20–35em` width on a paragraph to stay in range
- Constrain paragraph width even when the overall content area is wider (e.g., mixed text + images)

### Letter Spacing
- Trust the typeface designer and leave it alone by default
- **Tighten headlines:** fonts designed for body text (like Open Sans) have wider built-in letter-spacing that looks too spread out at large sizes
- **Loosen all-caps text:** all-caps loses the visual variety of ascenders/descenders; wider spacing restores legibility
- Increasing letter-spacing on small uppercase labels (`0.05em`) improves readability

### Baseline Alignment
When mixing font sizes on the same line (e.g., large title + small metadata), **align by baseline, not by vertical center**. Center-aligning offset baselines looks awkward at close proximity. Baseline alignment is the reference your eyes already use.

### Text Alignment
- **Left-align** body text and most UI copy (matches reading direction for Latin scripts)
- **Center-align** only: short headlines, hero text, 1–2 line standalone blocks. Never center-align paragraphs longer than 2–3 lines.
- **Right-align numbers in tables** — keeps decimals vertically aligned for easy comparison
- **Justified text + CSS hyphenation** if you want a print-like look: `hyphens: auto` is required or you get ugly word gaps

### Not Every Link Needs a Color
In dense UIs where almost everything is a link, colored underlined links become overbearing. Instead, de-emphasize most links using heavier weight or a slightly darker color. Reserve high-visibility link treatment (color + underline) for links embedded in body text paragraphs. Ancillary links can show underline only on hover.

### Font Recommendations

The official Refactoring UI font list is organized into three use-case categories. Each entry shows role + size combos extracted directly from the PDF examples — use them as starting anchors, not rigid rules.

**Key pairing insight:** The most common pattern is either a **weight contrast stack within one family** (e.g., Interstate Bold → Light → Regular) or a **serif/sans cross-pairing** (e.g., Jubilat headline + Proxima Nova body). Mixing two unrelated sans fonts is rarely shown — contrast comes from weight and size, not font switching.

#### Size Reference (from live PDF examples)

| Role | Typical size |
|------|-------------|
| Hero headline | 48px bold/black |
| Futura headline | 36px (geometric forms need optical space) |
| Subtitle / hero body | 24px |
| Article body | 18px |
| Button | 18–20px |
| Article meta / UI body | 14–16px |

---

#### Headlines
*Fonts suited for large display type on marketing pages and hero sections.*

**Proxima Nova** — `Headline: Bold 48px · Subtitle: Regular 24px · Button: Bold 20px`
Geometric-humanist hybrid; clean at any size. The workhorse of modern web UI. Versatile enough to serve as headline *and* body font. Commercial — Adobe Fonts, Fonts.com, FontShop, MyFonts. 16 styles (8 weights + italics). Designer: Mark Simonson.

**Freight Sans** — `Headline: Bold 48px · Subtitle: Proxima Nova Regular 24px · Button: Proxima Nova Bold 20px`
Humanist sans with warmth. Pairs with Proxima Nova at body sizes; also pairs with its serif sibling Freight Text for editorial use. Commercial — Adobe Fonts, Fonts.com, MyFonts. 12 styles. Designer: Joshua Darden / Garage Fonts.

**Futura** — `Headline: Bold 36px · Subtitle: Trade Gothic Next Regular 24px · Button: Trade Gothic Next Bold 20px`
Classic geometric sans. Note the 36px headline (not 48px) — geometric forms need more breathing room. Retro-modern feel. Pairs with Trade Gothic Next for a consistent geometric family stack. Commercial — Adobe Fonts, Fonts.com, FontShop, MyFonts. 12 styles. Designer: Paul Renner / Linotype.

**Harmonia Sans** — `Headline: Black 48px · Subtitle: Graphik Regular 24px · Button: Graphik Semibold 20px`
Grotesque sans with humanist touches. Black weight gives strong display impact; Graphik body provides neutral contrast. Commercial — Fonts.com, MyFonts. 10 styles. Designer: Jim Wasco / Monotype.

**Graphik** — `Headline: Black 48px · Subtitle: Regular 24px · Button: Semibold 18px`
Contemporary grotesque. Neutral and highly legible. 9-weight range allows a full single-family stack. Used by many tech companies. Can use as both headline and body. Commercial — Commercial Type only. 18 styles. Designer: Christian Schwartz.

**FF Meta Serif** — `Headline: Bold 48px · Subtitle: Myriad Pro Regular 24px · Button: Myriad Pro Semibold 20px`
Humanist serif. Brings warmth and editorial authority to headline-heavy layouts. Pairs with Myriad Pro (neutral humanist sans) for strong legibility contrast. Commercial — Adobe Fonts, Fonts.com, FontShop, MyFonts. 12 styles. Designers: Erik Spiekermann, Christian Schwartz, Kris Sowersby, and others / FontFont.

**Roboto** — `Headline: Black 48px · Subtitle: Regular 24px · Button: Bold 20px`
Mechanical skeleton with friendly curves. Free. The solid default for projects without a font budget. Apache 2.0 — Adobe Fonts, Google Fonts. 12 styles. Designer: Christian Robertson / Google.

**Jubilat** — `Headline: Semibold 48px · Subtitle: Proxima Nova Regular 24px · Button: Proxima Nova Bold 20px`
Slab serif with personality. Semibold (not Bold/Black) keeps it refined at large sizes. Classic Proxima Nova body pairing creates a modern-editorial hybrid feel. Commercial — Adobe Fonts. 24 styles (12 weights + italics). Publisher: Darden Studio.

**Interstate** — `Headline: Bold 48px · Subtitle: Light 24px · Button: Regular 20px`
Single-family weight-contrast stack — no font pairing needed. Industrial, signage-derived aesthetic. Great for utilitarian/infrastructure-themed products. Commercial — Adobe Fonts, TypeNetwork. 16 styles. Publisher: Font Bureau.

**Neue Plak** — `Headline: Extra Black 48px · Subtitle: Regular 24px · Button: Bold 20px`
Modern revival of Plak (a Futura companion). Extra Black makes a bold, high-contrast statement. Single-family stack, no italics. Commercial — Fonts.com, MyFonts, FontShop. 7 weights. Designers: Linda Hintz, Paul Renner, Toshi Omagari / Monotype.

**Adelle** — `Headline: Extra Bold 48px · Subtitle: Proxima Nova Regular 24px · Button: Proxima Nova Bold 20px`
Sturdy slab serif. Extra Bold at 48px gives editorial authority. Proxima Nova body pairing creates strong serif/sans contrast. Commercial — Adobe Fonts. 7 weights. Designers: José Scaglione, Veronika Burian / TypeTogether.

---

#### Articles
*Fonts optimized for reading — body text, titles, and meta/byline text in editorial and blog contexts.*

**Freight Text + Freight Sans** — `Body: Freight Text Book 18px · Title: Freight Sans Book 48px · Meta: Freight Sans Book 16px`
A matched superfamily — the serif (Freight Text) handles body, the sans (Freight Sans) handles UI chrome. The gold standard for editorial design. Commercial — Adobe Fonts, Fonts.com, MyFonts. 12 styles each. Designer: Joshua Darden / Garage Fonts.

**Source Sans** — `Body: Regular 18px · Title: Light 48px · Meta: Regular 16px`
Adobe's first open-source font. Clean humanist sans designed specifically for UI legibility. Single-family weight-contrast stack. Free — Open Font License. Adobe Fonts, MyFonts. 12 styles. Designer: Paul D. Hunt / Adobe.

**Open Sans** — `Body: Regular 18px · Title: Light 48px · Meta: Regular 16px`
Humanist sans, very neutral and friendly. Slightly wider letterforms than Source Sans — can feel more "corporate" at small sizes. Free — Apache 2.0. Adobe Fonts, Google Fonts. 10 styles. Designer: Steve Matteson / Google.

**Merriweather + Merriweather Sans** — `Body: Merriweather Light 16px · Title: Merriweather Sans 16px · Meta: Merriweather Sans 14px`
A matched serif/sans superfamily designed for screen reading. Note the smaller body size (16px) — Merriweather's robust serifs read well at smaller sizes. Title and meta share a size; hierarchy comes from weight and position. Free — Open Font License. Adobe Fonts, Google Fonts. 8 styles. Designer: Eben Sorkin / Sorkin Type Co.

**Proxima Nova + Freight Sans** *(cross-pairing)* — `Body: Proxima Nova Regular 18px · Title: Freight Sans Bold 48px · Meta: Proxima Nova Regular 16px`
Reverses the usual pattern — geometric sans as body, humanist sans for the display title. Clean, modern magazine aesthetic. Both commercial — see individual entries.

**Franklin Gothic** — `Body: Book 18px · Title: Demi 48px · Meta: Book 16px`
Classic American grotesque. Demi weight at 48px is distinctive and strong. Single-family stack. Timeless newspaper-editorial feel. Commercial — Adobe Fonts, Fonts.com, MyFonts. 10 styles.

**Camphor** *(Article)* — `Body: Regular 18px · Title: Light 48px · Meta: Regular 16px`
Geometric humanist hybrid. Light title weight creates elegant contrast with Regular body. Clean and modern without feeling cold. Commercial — Fonts.com, MyFonts, FontShop. 10 styles. Designer: Nick Job / Monotype.

---

#### Application UI
*Fonts for dense interfaces — navigation, forms, tables, labels. Legibility at 14–16px is the primary concern.*

**Inter** *(top free pick)* — Variable font with 12 weights. Designed specifically for computer screens, optimized for small sizes in UI contexts. The go-to free choice for SaaS products. Essentially the open-source alternative to Proxima Nova. Free — SIL OFL 1.1. rsms.me. Designer: Rasmus Andersson.

**Proxima Nova** *(top paid pick)* — See Headlines entry. Remains the top overall recommendation for app UI. Excellent legibility at small sizes across all weights.

**Graphik** — See Headlines entry. The neutral grotesque style makes it excellent for dense UI — doesn't compete with data or icons.

**Source Sans** — See Articles entry. Designed specifically for UI from the start, translates perfectly to app contexts. Free.

**Roboto** — See Headlines entry. Works as well in UI as in display contexts. Free. Default for Material Design.

**Lato** — Semi-rounded humanist sans. The slight roundness creates warmth while maintaining clean structure. Popular free alternative for SaaS products. Free — Open Font License. Adobe Fonts, Google Fonts (10 styles). 18 styles full. Designers: Łukasz Dziedzic, Adam Twardoch, Botio Nikoltchev.

**Avenir Next** — Geometric sans with humanist refinements. Classic Apple aesthetic (iOS/macOS). Elegant and timeless. Better legibility at small sizes than pure Futura. Commercial — Fonts.com, MyFonts, FontShop. 16 styles. Designers: Adrian Frutiger, Akira Kobayashi / Linotype.

**Open Sans** — See Articles entry. Works well across both article and app contexts. Free.

**Aktiv Grotesk** — Contemporary grotesque in the Helvetica tradition. Clean and neutral with better screen rendering than Helvetica. Commercial — Adobe Fonts, MyFonts. 16 styles. Publisher: Dalton Maag.

**Benton Sans** — Humanist grotesque. Warm and readable in dense layouts. Used by major news organizations for digital products. Commercial — Adobe Fonts, TypeNetwork. 16 styles. Designer: Cyrus Highsmith / Font Bureau.

**Soleil** — Geometric humanist hybrid. Slightly warmer than Graphik at small sizes. Commercial — Adobe Fonts, MyFonts. 12 styles. Designer: Paul D. Hunt / Adobe.

**Camphor** *(App UI)* — Clean geometric structure works equally well in form-heavy app layouts. See Article entry. Commercial — Fonts.com, MyFonts, FontShop.

**Neue Plak Text** — The text-optimized variant of Neue Plak, tuned for smaller sizes. Good when you want the Futura-family aesthetic at body/UI sizes. Commercial — Fonts.com, MyFonts, FontShop. 10 styles. Designers: Linda Hintz, Paul Renner, Toshi Omagari / Monotype.

**Effra** — Geometric grotesque with humanist details. Slightly warmer than pure geometric fonts. Good for healthcare/wellness product UIs. Commercial — Adobe Fonts, MyFonts. 10 styles. Designer: Jonas Schudel / Dalton Maag.

---

#### Quick Decision Guide

| Need | Best free option | Best paid option |
|------|-----------------|-----------------|
| App UI, any project | Inter | Proxima Nova |
| Marketing headline | Roboto | Proxima Nova / Graphik |
| Editorial/blog body | Merriweather | Freight Text |
| Single-family stack (app) | Lato / Source Sans | Graphik / Interstate |
| Serif headline, modern | — | Jubilat / Adelle |
| Serif headline, editorial | — | FF Meta Serif |
| Geometric/retro feel | — | Futura + Trade Gothic Next |
| Maximum weight range | Inter (variable) | Graphik (9 weights) |

### Text Color Hierarchy
Use multiple shades of the same hue, not just black:
- **Primary content:** #1a202c or similar dark
- **Secondary content:** ~60% opacity or a mid-gray
- **Tertiary / disabled:** ~40% opacity or light gray
- On dark backgrounds: use white at varying opacities (100%, 70%, 50%)

---

## Color

### Build a palette with 8–10 shades per color
For each hue (blue, gray, red, green, etc.), generate a scale from near-white to near-black:
```
050  → near white tint
100
200
300
400
500  → true/base color (what you think of as "blue")
600
700
800
900  → near black shade
```

### How to use the palette
- **Primary color** (brand): 500 level for backgrounds, 700 for hover states
- **Light tints** (100–200): backgrounds for badges, alerts, highlights
- **Dark shades** (700–900): text on light backgrounds
- Use the **same hue** for all these rather than mixing random colors

### Grays are the most important colors
You'll use grays more than any other color. Three gray families with distinct personalities:
- **Warm grey** — slight yellow/brown tint; friendlier, more organic
- **Cool grey** — slight blue tint; more technical/professional
- **Blue-grey** — more saturated blue tint; works beautifully with blue/indigo primaries
- **Pure grey** — neutral, no tint; safe default

### Accessible contrast
- Text on background must meet WCAG AA: **4.5:1** for normal text, **3:1** for large text
- Use a contrast checker before calling colors "done"
- Small text on colored backgrounds is a common failure point

**The flip technique:** White text on a dark colored background often requires the color to be very dark to hit 4.5:1 — which makes the element dominate the page unintentionally. Instead, flip it: use **dark colored text on a light colored background**. The color is still present (supporting the message), but it's far less aggressive.

**Colored text on colored backgrounds:** When picking secondary text color inside a dark panel, simply adjusting lightness often gets too close to pure white before reaching contrast. Try **rotating the hue toward a brighter hue** (cyan, magenta, or yellow) — this can boost contrast while keeping the text colorful.



### Don't use gray text on colored backgrounds
Gray on blue looks muddy. Instead: use a **lighter shade of the background color** for secondary text. (Adjust hue + saturation, not just lightness.)

### Color conveys meaning — use it consistently
- **Green:** success, positive, go
- **Red:** error, destructive, danger
- **Yellow/amber:** warning
- **Blue:** info, primary action
- Never use these colors for decoration in a way that conflicts with their semantic meaning

### Use HSL, not Hex or RGB
HSL (Hue, Saturation, Lightness) represents colors in terms your eyes intuitively perceive. Colors that look related in a UI will look similar in HSL code. Hex and RGB values of related colors look nothing alike.

- **Hue:** 0°–360° position on color wheel (0° = red, 120° = green, 240° = blue)
- **Saturation:** 0% = grey, 100% = vivid
- **Lightness:** 0% = black, 50% = pure hue, 100% = white

**HSL vs. HSB:** Design tools use HSB (Brightness), not HSL. They're different. HSB 100% brightness is only white at 0% saturation; at full saturation it equals HSL 50% lightness. Browsers understand HSL — use that in your CSS.

### Don't Let Lightness Kill Your Saturation
As a color approaches 0% or 100% lightness in HSL, the same saturation value looks increasingly washed out. To keep lighter/darker shades vivid, **increase saturation as you move away from 50% lightness**.

**Rotate hue to change perceived brightness without losing intensity:**
Perceived brightness varies by hue (yellow/cyan/magenta appear bright; red/green/blue appear dark). You can use this to change a color's brightness while keeping it vivid:
- To **lighten** a color while keeping it intense: rotate hue toward nearest bright hue (60°, 180°, or 300°)
- To **darken** while keeping it rich: rotate hue toward nearest dark hue (0°, 120°, or 240°)
- Don't rotate more than 20–30° or it starts to look like a different color

This is especially useful for yellows — rotating slightly toward orange as you darken prevents the muddy brown problem.

### Greys Don't Have to Be Grey (Temperature)
True grey is 0% saturation. But "grey" in a UI is almost always tinted — that tint creates temperature:
- **Cool greys:** saturate with blue (technical, professional feel)
- **Warm greys:** saturate with yellow/orange (friendly, organic feel)
- Increase saturation on lighter and darker shades to maintain consistent temperature (otherwise edge shades look washed out)



---

### Complete Swatches Reference
*Source: Refactoring UI Color Palettes v1.1.0 — swatches.json*
*This is the full master swatch list. Individual palettes combine these into curated sets.*

#### Reds
| Token | Hex |
|-------|-----|
| red-050 | #FFEEEE |
| red-100 | #FACDCD |
| red-200 | #F29B9B |
| red-300 | #E66A6A |
| red-400 | #D64545 |
| red-500 | #BA2525 |
| red-600 | #A61B1B |
| red-700 | #911111 |
| red-800 | #780A0A |
| red-900 | #610404 |

| Token | Hex |
|-------|-----|
| red-vivid-050 | #FFE3E3 |
| red-vivid-100 | #FFBDBD |
| red-vivid-200 | #FF9B9B |
| red-vivid-300 | #F86A6A |
| red-vivid-400 | #EF4E4E |
| red-vivid-500 | #E12D39 |
| red-vivid-600 | #CF1124 |
| red-vivid-700 | #AB091E |
| red-vivid-800 | #8A041A |
| red-vivid-900 | #610316 |

#### Oranges
| Token | Hex |
|-------|-----|
| orange-050 | #FFEFE6 |
| orange-100 | #FFD3BA |
| orange-200 | #FAB38B |
| orange-300 | #EF8E58 |
| orange-400 | #E67635 |
| orange-500 | #C65D21 |
| orange-600 | #AB4E19 |
| orange-700 | #8C3D10 |
| orange-800 | #77340D |
| orange-900 | #572508 |

| Token | Hex |
|-------|-----|
| orange-vivid-050 | #FFE8D9 |
| orange-vivid-100 | #FFD0B5 |
| orange-vivid-200 | #FFB088 |
| orange-vivid-300 | #FF9466 |
| orange-vivid-400 | #F9703E |
| orange-vivid-500 | #F35627 |
| orange-vivid-600 | #DE3A11 |
| orange-vivid-700 | #C52707 |
| orange-vivid-800 | #AD1D07 |
| orange-vivid-900 | #841003 |

#### Yellows
| Token | Hex |
|-------|-----|
| yellow-050 | #FFFAEB |
| yellow-100 | #FCEFC7 |
| yellow-200 | #F8E3A3 |
| yellow-300 | #F9DA8B |
| yellow-400 | #F7D070 |
| yellow-500 | #E9B949 |
| yellow-600 | #C99A2E |
| yellow-700 | #A27C1A |
| yellow-800 | #7C5E10 |
| yellow-900 | #513C06 |

| Token | Hex |
|-------|-----|
| yellow-vivid-050 | #FFFBEA |
| yellow-vivid-100 | #FFF3C4 |
| yellow-vivid-200 | #FCE588 |
| yellow-vivid-300 | #FADB5F |
| yellow-vivid-400 | #F7C948 |
| yellow-vivid-500 | #F0B429 |
| yellow-vivid-600 | #DE911D |
| yellow-vivid-700 | #CB6E17 |
| yellow-vivid-800 | #B44D12 |
| yellow-vivid-900 | #8D2B0B |

#### Greens
| Token | Hex |
|-------|-----|
| lime-green-050 | #F2FDE0 |
| lime-green-100 | #E2F7C2 |
| lime-green-200 | #C7EA8F |
| lime-green-300 | #ABDB5E |
| lime-green-400 | #94C843 |
| lime-green-500 | #7BB026 |
| lime-green-600 | #63921A |
| lime-green-700 | #507712 |
| lime-green-800 | #42600C |
| lime-green-900 | #2B4005 |

| Token | Hex |
|-------|-----|
| lime-green-vivid-050 | #F8FFED |
| lime-green-vivid-100 | #E6FFBF |
| lime-green-vivid-200 | #CAFF84 |
| lime-green-vivid-300 | #AFF75C |
| lime-green-vivid-400 | #8DED2D |
| lime-green-vivid-500 | #6CD410 |
| lime-green-vivid-600 | #5CB70B |
| lime-green-vivid-700 | #399709 |
| lime-green-vivid-800 | #2E7B06 |
| lime-green-vivid-900 | #1E5303 |

| Token | Hex |
|-------|-----|
| green-050 | #E3F9E5 |
| green-100 | #C1EAC5 |
| green-200 | #A3D9A5 |
| green-300 | #7BC47F |
| green-400 | #57AE5B |
| green-500 | #3F9142 |
| green-600 | #2F8132 |
| green-700 | #207227 |
| green-800 | #0E5814 |
| green-900 | #05400A |

| Token | Hex |
|-------|-----|
| green-vivid-050 | #E3F9E5 |
| green-vivid-100 | #C1F2C7 |
| green-vivid-200 | #91E697 |
| green-vivid-300 | #51CA58 |
| green-vivid-400 | #31B237 |
| green-vivid-500 | #18981D |
| green-vivid-600 | #0F8613 |
| green-vivid-700 | #0E7817 |
| green-vivid-800 | #07600E |
| green-vivid-900 | #014807 |

#### Teals & Cyans
| Token | Hex |
|-------|-----|
| teal-050 | #EFFCF6 |
| teal-100 | #C6F7E2 |
| teal-200 | #8EEDC7 |
| teal-300 | #65D6AD |
| teal-400 | #3EBD93 |
| teal-500 | #27AB83 |
| teal-600 | #199473 |
| teal-700 | #147D64 |
| teal-800 | #0C6B58 |
| teal-900 | #014D40 |

| Token | Hex |
|-------|-----|
| teal-vivid-050 | #F0FCF9 |
| teal-vivid-100 | #C6F7E9 |
| teal-vivid-200 | #8EEDD1 |
| teal-vivid-300 | #5FE3C0 |
| teal-vivid-400 | #2DCCA7 |
| teal-vivid-500 | #17B897 |
| teal-vivid-600 | #079A82 |
| teal-vivid-700 | #048271 |
| teal-vivid-800 | #016457 |
| teal-vivid-900 | #004440 |

| Token | Hex |
|-------|-----|
| cyan-050 | #E0FCFF |
| cyan-100 | #BEF8FD |
| cyan-200 | #87EAF2 |
| cyan-300 | #54D1DB |
| cyan-400 | #38BEC9 |
| cyan-500 | #2CB1BC |
| cyan-600 | #14919B |
| cyan-700 | #0E7C86 |
| cyan-800 | #0A6C74 |
| cyan-900 | #044E54 |

| Token | Hex |
|-------|-----|
| cyan-vivid-050 | #E1FCF8 |
| cyan-vivid-100 | #C1FEF6 |
| cyan-vivid-200 | #92FDF2 |
| cyan-vivid-300 | #62F4EB |
| cyan-vivid-400 | #3AE7E1 |
| cyan-vivid-500 | #1CD4D4 |
| cyan-vivid-600 | #0FB5BA |
| cyan-vivid-700 | #099AA4 |
| cyan-vivid-800 | #07818F |
| cyan-vivid-900 | #05606E |

#### Blues
| Token | Hex |
|-------|-----|
| light-blue-050 | #EBF8FF |
| light-blue-100 | #D1EEFC |
| light-blue-200 | #A7D8F0 |
| light-blue-300 | #7CC1E4 |
| light-blue-400 | #55AAD4 |
| light-blue-500 | #3994C1 |
| light-blue-600 | #2D83AE |
| light-blue-700 | #1D6F98 |
| light-blue-800 | #166086 |
| light-blue-900 | #0B4F71 |

| Token | Hex |
|-------|-----|
| light-blue-vivid-050 | #E3F8FF |
| light-blue-vivid-100 | #B3ECFF |
| light-blue-vivid-200 | #81DEFD |
| light-blue-vivid-300 | #5ED0FA |
| light-blue-vivid-400 | #40C3F7 |
| light-blue-vivid-500 | #2BB0ED |
| light-blue-vivid-600 | #1992D4 |
| light-blue-vivid-700 | #127FBF |
| light-blue-vivid-800 | #0B69A3 |
| light-blue-vivid-900 | #035388 |

| Token | Hex |
|-------|-----|
| blue-050 | #DCEEFB |
| blue-100 | #B6E0FE |
| blue-200 | #84C5F4 |
| blue-300 | #62B0E8 |
| blue-400 | #4098D7 |
| blue-500 | #2680C2 |
| blue-600 | #186FAF |
| blue-700 | #0F609B |
| blue-800 | #0A558C |
| blue-900 | #003E6B |

| Token | Hex |
|-------|-----|
| blue-vivid-050 | #E6F6FF |
| blue-vivid-100 | #BAE3FF |
| blue-vivid-200 | #7CC4FA |
| blue-vivid-300 | #47A3F3 |
| blue-vivid-400 | #2186EB |
| blue-vivid-500 | #0967D2 |
| blue-vivid-600 | #0552B5 |
| blue-vivid-700 | #03449E |
| blue-vivid-800 | #01337D |
| blue-vivid-900 | #002159 |

#### Indigo & Purple
| Token | Hex |
|-------|-----|
| indigo-050 | #E0E8F9 |
| indigo-100 | #BED0F7 |
| indigo-200 | #98AEEB |
| indigo-300 | #7B93DB |
| indigo-400 | #647ACB |
| indigo-500 | #4C63B6 |
| indigo-600 | #4055A8 |
| indigo-700 | #35469C |
| indigo-800 | #2D3A8C |
| indigo-900 | #19216C |

| Token | Hex |
|-------|-----|
| indigo-vivid-050 | #D9E8FF |
| indigo-vivid-100 | #B0D0FF |
| indigo-vivid-200 | #88B1FC |
| indigo-vivid-300 | #5E8AEE |
| indigo-vivid-400 | #3A66DB |
| indigo-vivid-500 | #2251CC |
| indigo-vivid-600 | #1D3DBF |
| indigo-vivid-700 | #132DAD |
| indigo-vivid-800 | #0B1D96 |
| indigo-vivid-900 | #061178 |

| Token | Hex |
|-------|-----|
| purple-050 | #EAE2F8 |
| purple-100 | #CFBCF2 |
| purple-200 | #A081D9 |
| purple-300 | #8662C7 |
| purple-400 | #724BB7 |
| purple-500 | #653CAD |
| purple-600 | #51279B |
| purple-700 | #421987 |
| purple-800 | #34126F |
| purple-900 | #240754 |

| Token | Hex |
|-------|-----|
| purple-vivid-050 | #F2EBFE |
| purple-vivid-100 | #DAC4FF |
| purple-vivid-200 | #B990FF |
| purple-vivid-300 | #A368FC |
| purple-vivid-400 | #9446ED |
| purple-vivid-500 | #8719E0 |
| purple-vivid-600 | #7A0ECC |
| purple-vivid-700 | #690CB0 |
| purple-vivid-800 | #580A94 |
| purple-vivid-900 | #44056E |

#### Magentas & Pinks
| Token | Hex |
|-------|-----|
| magenta-050 | #F5E1F7 |
| magenta-100 | #ECBDF2 |
| magenta-200 | #CE80D9 |
| magenta-300 | #BB61C7 |
| magenta-400 | #AD4BB8 |
| magenta-500 | #A23DAD |
| magenta-600 | #90279C |
| magenta-700 | #7C1A87 |
| magenta-800 | #671270 |
| magenta-900 | #4E0754 |

| Token | Hex |
|-------|-----|
| magenta-vivid-050 | #FDEBFF |
| magenta-vivid-100 | #F8C4FE |
| magenta-vivid-200 | #F48FFF |
| magenta-vivid-300 | #F368FC |
| magenta-vivid-400 | #ED47ED |
| magenta-vivid-500 | #E019D0 |
| magenta-vivid-600 | #CB10B8 |
| magenta-vivid-700 | #B30BA3 |
| magenta-vivid-800 | #960888 |
| magenta-vivid-900 | #6E0560 |

| Token | Hex |
|-------|-----|
| pink-050 | #FFE0F0 |
| pink-100 | #FAB8D9 |
| pink-200 | #F191C1 |
| pink-300 | #E668A7 |
| pink-400 | #DA4A91 |
| pink-500 | #C42D78 |
| pink-600 | #AD2167 |
| pink-700 | #9B1B5A |
| pink-800 | #781244 |
| pink-900 | #5C0B33 |

| Token | Hex |
|-------|-----|
| pink-vivid-050 | #FFE3EC |
| pink-vivid-100 | #FFB8D2 |
| pink-vivid-200 | #FF8CBA |
| pink-vivid-300 | #F364A2 |
| pink-vivid-400 | #E8368F |
| pink-vivid-500 | #DA127D |
| pink-vivid-600 | #BC0A6F |
| pink-vivid-700 | #A30664 |
| pink-vivid-800 | #870557 |
| pink-vivid-900 | #620042 |

#### Grays (choose one family per project)
| Token | Hex | Token | Hex | Token | Hex | Token | Hex |
|-------|-----|-------|-----|-------|-----|-------|-----|
| grey-050 | #F7F7F7 | cool-grey-050 | #F5F7FA | warm-grey-050 | #FAF9F7 | blue-grey-050 | #F0F4F8 |
| grey-100 | #E1E1E1 | cool-grey-100 | #E4E7EB | warm-grey-100 | #E8E6E1 | blue-grey-100 | #D9E2EC |
| grey-200 | #CFCFCF | cool-grey-200 | #CBD2D9 | warm-grey-200 | #D3CEC4 | blue-grey-200 | #BCCCDC |
| grey-300 | #B1B1B1 | cool-grey-300 | #9AA5B1 | warm-grey-300 | #B8B2A7 | blue-grey-300 | #9FB3C8 |
| grey-400 | #9E9E9E | cool-grey-400 | #7B8794 | warm-grey-400 | #A39E93 | blue-grey-400 | #829AB1 |
| grey-500 | #7E7E7E | cool-grey-500 | #616E7C | warm-grey-500 | #857F72 | blue-grey-500 | #627D98 |
| grey-600 | #626262 | cool-grey-600 | #52606D | warm-grey-600 | #625D52 | blue-grey-600 | #486581 |
| grey-700 | #515151 | cool-grey-700 | #3E4C59 | warm-grey-700 | #504A40 | blue-grey-700 | #334E68 |
| grey-800 | #3B3B3B | cool-grey-800 | #323F4B | warm-grey-800 | #423D33 | blue-grey-800 | #243B53 |
| grey-900 | #222222 | cool-grey-900 | #1F2933 | warm-grey-900 | #27241D | blue-grey-900 | #102A43 |

---

### Curated Palettes (24 ready-to-use combinations)
Each palette = 1 primary + 1 neutral gray + 2–4 supporting colors + semantic colors (red/yellow/green).
The neutral gray family is chosen to complement the primary.

| # | Primary | Neutral Gray | Supporting | Character |
|---|---------|-------------|------------|-----------|
| 01 | cyan | grey | indigo, pink | Fresh, modern |
| 02 | blue | blue-grey | cyan | Classic, trustworthy |
| 03 | purple | blue-grey | light-blue-vivid | Creative, premium |
| 04 | teal | blue-grey | blue | Professional, calm |
| 05 | blue-grey | (self) | light-blue-vivid | Minimal, corporate |
| 06 | red | warm-grey | cyan | Bold, energetic |
| 07 | cyan | warm-grey | blue | Friendly, approachable |
| 08 | blue-vivid | cool-grey | cyan-vivid | Sharp, tech |
| 09 | light-blue-vivid | cool-grey | pink-vivid | Airy, playful |
| 10 | indigo | cool-grey | light-blue-vivid | Serious, developer tool |
| 11 | pink-vivid | cool-grey | purple-vivid | Bold, consumer |
| 12 | green | grey | purple | Natural, balanced |
| 13 | yellow-vivid | grey | red-vivid | Energetic, warnings |
| 14 | orange | grey | light-blue | Warm, inviting |
| 15 | blue | blue-grey | teal-vivid | Modern SaaS |
| 16 | purple | blue-grey | teal-vivid | Rich, contemporary |
| 17 | magenta | blue-grey | yellow-vivid | Expressive, vibrant |
| 18 | purple | warm-grey | cyan | Elegant, sophisticated |
| 19 | indigo | cool-grey | magenta-vivid | Bold, modern |
| 20 | light-blue | cool-grey | purple | Soft, professional |
| 21 | orange-vivid | cool-grey | indigo | High contrast, bold |
| 22 | indigo | cool-grey | pink-vivid | Dark, dramatic |
| 23 | teal-vivid | grey | yellow-vivid | Vibrant, tropical |
| 24 | yellow | grey | blue | Sunny, optimistic |

### How to choose a palette
- **B2B / enterprise / developer tool:** 02, 04, 05, 08, 10, 15
- **Consumer / lifestyle:** 09, 11, 17, 22, 23
- **Health / finance / trust:** 02, 04, 12, 20
- **Creative / agency / portfolio:** 03, 16, 18, 19
- **Energetic / startup:** 08, 13, 21, 23

### How to use a palette in code (Tailwind example)
```js
// tailwind.config.js — using Palette 10 (indigo + cool-grey)
module.exports = {
  theme: {
    colors: {
      primary: {
        50:  '#E0E8F9',
        100: '#BED0F7',
        200: '#98AEEB',
        300: '#7B93DB',
        400: '#647ACB',
        500: '#4C63B6',  // default brand color
        600: '#4055A8',  // hover
        700: '#35469C',  // active/pressed
        800: '#2D3A8C',
        900: '#19216C',
      },
      gray: {
        50:  '#F5F7FA',
        100: '#E4E7EB',
        200: '#CBD2D9',
        300: '#9AA5B1',
        400: '#7B8794',
        500: '#616E7C',
        600: '#52606D',
        700: '#3E4C59',
        800: '#323F4B',
        900: '#1F2933',
      },
      // Always include semantic colors:
      danger:  { 500: '#BA2525', 100: '#FACDCD' },  // red
      warning: { 500: '#E9B949', 100: '#FCEFC7' },  // yellow
      success: { 500: '#3F9142', 100: '#C1EAC5' },  // green
    }
  }
}
```

---

## Spacing & Layout

### The spacing scale
Use a base unit (typically 4px or 8px) and multiply:
```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128...
```
Only pick from this scale. Never use odd values like 13px or 22px.

### More whitespace = more premium
Dense UIs feel cheap/rushed. Generous whitespace signals confidence and quality. When in doubt, add more space.

### Whitespace communicates relationships
Elements that are **closer together** appear related. Use this intentionally:
- Label close to its input
- Section headings closer to the content below than the section above

### Grids are overrated
Don't let a 12-column grid dictate element widths. Many elements should have **fixed widths**, not percentage-based fluid widths:
- A sidebar shouldn't grow endlessly as the screen widens — give it a fixed width and let the main content flex
- A login card shouldn't be 50% of a 1600px screen just because you're on a 12-column grid
- Use `max-width` to cap elements at their optimal size. Don't force an element to shrink until the screen is actually smaller than that max-width.
- Fluid widths make sense for content that genuinely benefits from using more space (main content areas, article text, data tables).

### Relative sizing doesn't scale across breakpoints
Don't define your headline as `2.5em` (relative to body) thinking it will auto-scale. At desktop (18px body → 45px headline) the ratio makes sense; at mobile (14px body → 35px headline) that's still too big. **Break the relationship** — set headline sizes independently per breakpoint.

Large elements need to shrink *faster* than small elements at smaller screen sizes. The ratio between large and small elements should be less extreme on mobile than on desktop.

The same principle applies within components: buttons shouldn't have padding that proportionally scales with font size. A large button should have *disproportionately more* padding than a small button — that's what makes it feel like a different-sized button, not just a zoomed-in version.

### Avoid ambiguous spacing
When spacing groups of elements, the space **between groups** must be larger than the space **within a group**, or the relationships aren't clear. This applies to:
- Form labels and their inputs (label should be closer to its input than to the input above)
- Section headings (closer to the content below than the section above)
- List items with supporting text
- Any horizontal grouping of elements

Whenever you're relying only on spacing to communicate grouping, more space around the group than within it is the rule.

### Narrow content in a wide layout → use columns
If you have a narrow form in an otherwise wide layout, don't stretch it to fill the width (it'll look bad). Instead, split the layout into columns — e.g., put the form in one column and supporting/explanatory text in another. This fills the space without compromising the optimal form width.



---

## Visual Hierarchy

### Not everything can be important
Every element that is "emphasized" means nothing is. Intentionally **de-emphasize** secondary elements rather than over-emphasizing primary ones.

### Three-tier hierarchy for most UIs
1. **Primary** — what the user needs most (large, high-contrast, prominent)
2. **Secondary** — supporting info (medium size, medium contrast)
3. **Tertiary** — metadata, labels, timestamps (small, low-contrast)

### Use size AND weight AND color for hierarchy
Relying only on size makes everything look like a wall of headings. Combine:
- Font size (bigger = more important)
- Font weight (heavier = more important)
- Color contrast (higher contrast = more important)

### Hierarchy through contrast, not just size
A small, bold, dark element can outrank a large, light, thin one. Use this to create interest without everything being huge.

### De-emphasize with color, not size
You often don't want to make secondary info smaller — it becomes unreadable. Instead, use a lighter/lower-contrast color.

---

## Shadows & Depth

### Emulate a light source
Light comes from above. This determines the direction of all shadow/highlight effects:
- **Raised elements:** Top edge is lighter (faces upward, receives light) — use a top border or `inset 0 1px 0` box-shadow in a lighter shade. Bottom casts a shadow — use a small dark `box-shadow: 0 2px 4px` below. Don't use semi-transparent white for the top highlight — it desaturates the color; pick a lighter shade of the hue manually.
- **Inset elements (wells, inputs):** Only the bottom lip is visible (facing upward); give it a slightly lighter color via bottom border or `inset 0 -1px 0`. Add a small dark inset shadow at the top: `inset 0 2px 4px rgba(0,0,0,0.06)`.

Don't go overboard — photo-realistic depth in UIs looks busy. Borrow just enough cues to establish depth.

### Shadow scale (5 levels is enough)
```
xs:  0 1px 2px rgba(0,0,0,0.05)
sm:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)
xl:  0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)
```

### Shadows convey elevation, not decoration
Use shadows to communicate that an element floats above the page:
- Cards: `sm` shadow
- Dropdowns: `lg` shadow
- Modals: `xl` shadow
- Buttons: very subtle `xs` or none

**Interactive shadows:** Increase shadow on drag (item feels lifted), decrease/remove shadow on button press (feels pressed into the page). Don't think about the shadow itself — think about where the element should sit on the z-axis.

### Two-layer shadows look more realistic
Shadow 1: large + soft + more vertical offset (simulates direct light casting shadow behind object). Shadow 2: small + dark + tight (simulates where ambient light can't reach near the element's base). As elevation increases, the second shadow fades — almost invisible at highest elevation.

### Inset shadows for "sunken" inputs
A subtle `box-shadow: inset 0 2px 4px rgba(0,0,0,0.06)` on inputs makes them feel recessed — a natural affordance for editability.

### Even flat designs can have depth
Flat design ≠ no depth. Two techniques that work without shadows or gradients:
- **Color depth:** Lighter = closer, darker = further away. An element lighter than the background feels raised; darker feels inset.
- **Solid shadows:** No blur radius at all — `box-shadow: 4px 4px 0 #000`. Creates a strong flat-aesthetic depth cue for cards/buttons.

### Overlap elements to create layers
Instead of containing a card entirely within its parent, offset it so it crosses the boundary between two backgrounds — immediately creates a layered feel. Or make an element taller than its parent so it overlaps on both sides. **Invisible border trick for overlapping images:** give images a border that matches the background color — creates visual separation without color clashing.



---

## Buttons

### Primary vs. Secondary hierarchy
The visual weight of a button should match the importance of its action:
- **Primary action:** Filled, high-contrast background (your brand color)
- **Secondary action:** Outlined or soft background — lower visual weight
- **Tertiary / destructive:** Ghost or plain text link style

### Button shape options (from Component Gallery)
| Style | Border Radius | When to use |
|-------|---------------|-------------|
| Small rounded | ~4px | Dense UIs, tight spaces |
| Large rounded | ~8px | Modern apps, forms |
| Full rounded (pill) | 9999px | Badges, CTAs, friendly/playful feel |
| Square | 0px | Very serious/technical tone |

### Button variants to know
- **Uppercase text:** Adds formality; pair with letter-spacing: 0.05em
- **Vertical gradient:** Adds depth; subtle top-to-bottom lighten-to-darken
- **Soft shadow:** `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` lifts without border
- **Raised with bottom profile:** `border-bottom: 2px solid rgba(0,0,0,0.15)` — looks "pressable"
- **With icon left/right:** Icon should be 16–20px, optically centered

### Button sizing
Always use **padding** to define button size, not fixed heights. This lets text wrap gracefully if needed.
```css
/* Typical button padding ratios */
sm:  py-1.5 px-3
md:  py-2   px-4
lg:  py-3   px-6
```

---

## Form Inputs

### Border radius should match buttons
Inputs and buttons used together should share the same border-radius family (both rounded, or both square).

### Input style options (from Component Gallery)
| Style | CSS approach | Feel |
|-------|-------------|------|
| Small/large rounded | border-radius | Friendly, modern |
| Full rounded | border-radius: 9999px | Pill input, very friendly |
| Square | border-radius: 0 | Serious, technical |
| Thick border | border-width: 2px | High visibility, accessible |
| Bottom border only | border-bottom only | Clean, minimal, "Material-ish" |
| No border | background only | Very minimal, needs strong bg contrast |
| Inset shadow | box-shadow: inset | Classic "sunken" input feel |
| Box shadow | drop shadow | Slightly elevated |
| Soft background | light gray bg + no border | Modern, Airbnb-style |
| Soft bg + bottom border | bg + bottom border only | Best of both worlds |

### Label patterns
- **Label above input** — standard, most accessible, easiest to implement
- **Label inside input (floating)** — trendy but complex; label starts as placeholder, floats up on focus
- **Overlapping label** — label sits on the top border of the input frame
- **Small uppercase label** — `font-size: 11-12px; letter-spacing: 0.05em; text-transform: uppercase` — gives a form a polished, structured feel
- **Icon as label** — only for universally understood icons (search, user, envelope)

### Label inside input (inset label pattern)
```
┌─────────────┐
│ Label        │
│ Placeholder  │
└─────────────┘
```
The label is small text inside the input box, above the placeholder. Clean, space-efficient.

### Placeholder text
- Use placeholders as **examples**, not as labels (don't replace labels with placeholders)
- Placeholder disappears on type — user loses context
- Low contrast by design (lighter than input text)

---

## Input Groups

### Attached vs. detached buttons
- **Attached:** Input and button share a border; button attaches directly to input's right edge. Compact, single visual unit.
- **Detached:** Input and button are separate elements with a small gap. Slightly less connected but easier to style.

### Input group patterns (from Component Gallery)
- Small rounded / attached
- Small rounded / detached
- Large rounded / inset button (button sits inside the input visually)
- Bottom border connected to button
- Full rounded with offset button (button overlaps end of pill input)
- With just an icon button (arrow →)
- With gapped border (border has a visual gap around the button area)

### Full rounded + offset button
The pill-shaped input group where the button appears to float slightly above the right end is a popular newsletter/signup pattern. The button uses `border-radius: 9999px` and has a slight negative margin or absolute positioning.

---

## Error Validation Patterns

### Placement options (from Component Gallery)
| Pattern | When to use |
|---------|-------------|
| Inline below input (no background) | Clean, minimal; text in red |
| Inline below input (solid background) | More prominent; dark pill below field |
| Inline connected to input | Error box attaches directly to input bottom |
| Icon with tooltip on focus | Saves space; ❗ icon inside field, tooltip on focus |
| Inline right of input | Error appears as tooltip-style callout to the right |
| Listed above form | Gather all errors at top (traditional form pattern) |
| Listed below form | Errors appear after submit button |

### Best practices
- Show errors **after** the user has interacted with a field (not immediately on load)
- Use **red** for error states consistently
- Pair error text with a **border color change** on the input (red border = invalid)
- Keep error messages specific: "Must be at least 8 characters" not just "Invalid"

---

## Badges

### Badge anatomy
A badge is a small label used to show status, category, count, or tag. Key CSS properties:
```css
border-radius: 9999px; /* full rounded, most common */
padding: 2px 10px;
font-size: 12px;
font-weight: 500;
```

### Badge style matrix (from Component Gallery)

**Background styles:**
- Solid background (dark, high contrast) — strong/definitive status
- Soft background (light tint of color) — subtle, non-aggressive

**Border styles:**
- Thick soft border — more prominent than soft bg alone
- Thin soft border — very subtle, almost invisible
- Combination: soft bg + soft border — popular, layered depth

**Shape:**
- Full rounded (pill) — friendlier, most common
- Small rounded — more "label"-like
- Circle — for numeric counts (notification badges)

### Badge with icon
Add a small checkmark or dot icon before the label text for status badges (e.g., ✓ Active). Keep icon at 12–14px.

---

## Navigation Patterns

### Horizontal navigation tab styles (from Component Gallery)
| Style | Visual cue for active state |
|-------|----------------------------|
| Contained with light active state | White bg on active tab |
| Contained with dark active state | Dark filled bg on active tab |
| Full rounded | Pill-shaped active indicator |
| Bottom border (thin/thick) | Underline on active tab |
| Raised active state | Active tab appears "lifted" |
| Soft/dark small rounded | Subtle chip highlight |
| With icons | Icon above or left of label |
| With stacked icons | Icon centered above label, stacked vertically |

### Vertical navigation styles (from Component Gallery)
| Style | When to use |
|-------|-------------|
| Full background highlight | Most common sidebar pattern |
| Left border on active | Clean, minimal; colored left accent |
| Right border on active | Less common; used when sidebar is on right |
| Full/small rounded pill | Friendly, modern apps (Notion-style) |
| Bold on active | Typography-only, no color change |
| Directly on background | No card/panel; floats on page bg |
| On panel | Inside a white card/panel |
| Sections with headings | Group nav items with uppercase labels |

### Key nav principle
The active state should be **unmistakable** — never ambiguous. Use at least 2 cues (e.g., color + weight, or background + border).

---

## Tables

### Table style options (from Component Gallery)
| Style | Use case |
|-------|----------|
| Zebra striping | Dense data tables; helps eye track rows |
| With borders | Very structured/tabular data, spreadsheet-like |
| Condensed | Compact row height for dashboards |
| With images | User/product tables |
| Multi-row | Supporting content under main cell |
| Grouping column | Merged left column labels for row groups |
| Grouping row | Shaded row as group separator/header |

### Table design principles
- **Right-align numbers** — makes columns easier to compare
- **Left-align text** — standard reading direction
- **Header row:** Use uppercase + letter-spacing OR bold + slightly different bg
- Column widths should be **content-driven**, not equal-width
- Use `table-layout: fixed` with explicit widths for predictable columns

---

## Cards & Preview Components

### Preview card layouts (from Component Gallery)
**Horizontal (left image):**
- Left image / Title / Meta / Excerpt
- Left image / Meta / Title / Excerpt (meta like author/date above title)
- Left image / Title / Excerpt / Meta
- Left image / Title / Meta / Excerpt / Link (with CTA)
- Left inset image (image has border/inset padding)
- Left image / No card (no card border, floats on bg)

**Vertical (top image):**
- Top image / Title / Meta / Excerpt
- Top image / with button
- Top image / with full-width button
- Top inset image (image padded inside card)
- Top image / No card

**Thumbnails:**
- Thumbnail + wrapped content (content wraps around small thumbnail)
- Thumbnail + indented content (content indented to align past thumbnail)

### Card elevation levels
Use shadow scale to indicate interactivity:
- **Static info card:** no shadow or `xs` shadow
- **Clickable card:** `sm` shadow; add hover state with `md` shadow + slight translate-y
- **Modal/overlay:** `xl` shadow

### Hover state for clickable cards
```css
.card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: box-shadow 150ms, transform 150ms;
}
.card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
```

---

## Modals

### Modal background overlay options
- **White shim** (white at ~90% opacity): content remains partially visible, softer feel
- **Dark shim** (black at ~50-60% opacity): stronger focus on modal, standard

### Modal button placement patterns (from Component Gallery)
| Layout | When to use |
|--------|-------------|
| Right-aligned (primary right, secondary left) | Standard; most common |
| Left-aligned buttons | Rare; when actions relate to left-side content |
| Full-width buttons stacked | Mobile-first or simple confirmation dialogs |
| Full-width split buttons | Two equal-weight actions (e.g., "Cancel" / "Confirm") |
| Full page | No overlay — navigates to a "modal page" |

### Modal principles
- Always include a **close button (×)** in top-right
- Clicking the backdrop should close the modal (unless destructive action)
- Trap keyboard focus inside the modal while open
- Animate in: `opacity 0→1` + `translateY(8px→0)` over ~150ms

---

## Alerts

### Alert style options (from Component Gallery)
| Style | Notes |
|-------|-------|
| Title bar / bottom description | Dark header bar with lighter body area |
| Soft background + thick border + icon | Most versatile; clear but not alarming |
| Solid background + icon | High urgency |
| Full-width + icon | Spans full container width (e.g., page-level notices) |
| Top accent border + icon | Subtle; thin colored top border as accent |
| Left accent border + icon | Classic "callout" pattern; widely used |
| Single line / dark background | Toast-like, compact |
| Single line / soft background | Minimal inline notice |

### Alert color usage
- 🔴 **Red/danger:** Errors, destructive warnings
- 🟡 **Yellow/warning:** Non-blocking warnings, "heads up" messages
- 🟢 **Green/success:** Confirmations, successful actions
- 🔵 **Blue/info:** Neutral info, tips, non-urgent notices

---

## Pagination

### Pagination style options (from Component Gallery)
| Style | Use case |
|-------|----------|
| Page numbers + Previous/Next | Standard; good default |
| Page numbers + chevrons (< >) | More compact |
| With truncation (1 2 3 … 10) | Long page lists |
| Next/Previous only | Simple content, no page-jumping needed |
| Attached next/previous | Joined as one control |
| First/Last buttons | Very long lists; power user navigation |
| Thick bottom border on active | Tab-like active state |
| Circle around active | Clear focus indicator |
| Thin top/bottom border | Minimal, understated |
| No borders on numbers | Lightest possible visual weight |
| Full rounded corners | Pill-style; friendlier feel |
| "Load more" button | Infinite-scroll alternative; progressive loading |
| Current page display (< 2 of 10 >) | Mobile-friendly; minimal footprint |

---

## Breadcrumbs

### Breadcrumb separator options (from Component Gallery)
- Chevrons: `Home > Shop > Cart`
- Slashes: `Home / Shop / Cart`
- Dots: `Home • Shop • Cart`
- Contained with arrow shapes (CSS clip-path chevron tabs)

### Breadcrumb style options
- Plain text separators
- Contained with arrows (tabs that overlap)
- With icons per section
- With numbers (`01 Home  02 Shop`)
- With home icon only (🏠 Shop > Cart)
- With dotted border
- Active/current item in bold, previous items in muted color

---

## Activity Feeds

### Layout options (from Component Gallery)
| Style | When to use |
|-------|-------------|
| Image + timestamp below detail | Standard; thumbnail-first |
| Image + timestamp on right | Cleaner; timestamp aligned right |
| Thumbnail connected with lines | Vertical line connecting items (timeline) |
| Dots connected with lines | Even more minimal; just dots on a line |
| Condensed (no thumbnail) | Compact event log |
| Alternating sides | Visual interest for important timelines |

### Activity feed principles
- Timestamps should be **relative** ("3 hours ago") not absolute for recent items
- Use **absolute** timestamps for items older than ~1 week
- Keep action descriptions short and scannable
- Group items by date when feed gets long

---

## Page-Level Patterns

### Sign-in form layouts (from Component Gallery)
- Simple (no card, centered)
- Simple card (centered card on gray bg)
- Two-pane with image (split screen: image left, form right)
- Two-pane with testimonial (social proof on left, form right)
- Two-pane with list (features/benefits list on left)
- Full page (form fills left side, image fills right)

### Pricing page patterns (from Component Gallery)
- Single tier (centered or left-aligned card)
- Two-tier cards (side by side)
- Two-tier with emphasized plan (one card visually "featured")
- Three/four-tier cards
- Three-tier heavy with emphasis
- Multi-tier chart (feature comparison grid)
- Multi-tier table (radio select rows with prices)
- Variable pricing (slider-driven price display)

### Marketing hero patterns (from Component Gallery)
- Left text / right image
- Left text / left image (reversed)
- Centered text / image below
- Background cover image / left text
- Background cover image / centered text
- With sign-in form on right
- With newsletter sign-up

### Header navigation patterns
- Logo left + search + right nav with global actions (profile icon, bell)
- Logo left + nav + right search + global actions
- Centered nav with search on both sides
- Navigation left + centered logo
- Second-row navigation (two-tier header)
- No background (transparent over hero)

### Footer patterns
- Site map + about section + social icons + legal
- Company logo + about + site map + legal (standard marketing footer)
- Centered site map + social icons + legal
- Logo + navigation + social icons + legal
- Newsletter sign-up on top + site map + legal

### Application layout patterns
- Vertical nav overlapping horizontal nav (sidebar + top bar)
- Horizontal nav under vertical nav
- Constrained content area + vertical navigation
- Constrained content area + full-width horizontal nav
- Multi-layered side navigation (expandable tree)
- Card grid layout
- Three-column layout
- Secondary right column (main content + sidebar)
- Side bar only (no top nav)
- Side bar icon navigation only (icon-only collapsed sidebar)

---

## Icons

### Size guidelines
- **Inline icons** (next to text): match cap-height of text, typically 16–20px
- **Feature icons** (standalone): 24–32px in a container
- **Marketing icons** (hero sections): 40–80px
- Never scale SVG icons above their designed size — redraw or use a larger icon set

### Icon style consistency
Use icons from **one family only** per project. Mixing outline, filled, and duotone icons looks unprofessional. Common choices:
- Heroicons (Tailwind team) — outline + solid
- Feather Icons — clean outline, 24px grid
- Phosphor Icons — very complete, multiple weights

### Icons as labels
Only replace text labels with icons if the icon is universally understood in context:
- ✅ Magnifying glass = search
- ✅ Envelope = email
- ✅ × = close
- ❌ Hamburger = not always understood
- Always include `aria-label` or tooltip for icon-only buttons

### Colorizing icons
- On solid colored buttons: use white or very light icon
- On soft background badges/alerts: use the darker shade of the same hue
- Never use a different hue for an icon than its container unless intentional

### Refactoring UI Icon Set (Icons v1.0.2)
All solid-fill SVG icons. Naming convention: `icon-{name}.svg`. Use at 16–24px; enclose in a colored container for larger display sizes.

**Actions**
`add` · `add-circle` · `add-square` · `remove` · `remove-circle` · `remove-square` · `close` · `close-circle` · `close-square` · `check` · `edit` · `trash` · `duplicate` · `refresh` · `send` · `attach` · `pin` · `flag` · `tag` · `archive`

**Navigation & UI**
`cheveron-down` · `cheveron-up` · `cheveron-down-circle` · `cheveron-up-circle` · `cheveron-left-circle` · `cheveron-right-circle` · `cheveron-selection` · `arrow-thick-down-circle` · `arrow-thick-up-circle` · `arrow-thick-left-circle` · `arrow-thick-right-circle` · `arrow-thin-down-circle` · `arrow-thin-up-circle` · `arrow-thin-left-circle` · `arrow-thin-right-circle` · `arrows-merge` · `arrows-split` · `menu` · `dots-horizontal` · `dots-vertical` · `external-window` · `zoom-in` · `zoom-out`

**Users & Identity**
`user` · `user-add` · `user-remove` · `user-check` · `user-circle` · `user-couple` · `user-group` · `identification` · `key` · `lock` · `lock-open` · `security` · `security-check` · `security-important`

**Communication**
`mail` · `chat` · `chat-group` · `chat-group-alt` · `announcement` · `notification` · `notification-off` · `microphone` · `phone-ring` · `phone-incoming-call` · `phone-outgoing-call` · `at`

**Documents & Data**
`document` · `document-add` · `document-remove` · `document-notes` · `folder` · `folder-add` · `folder-remove` · `collection` · `layers` · `library` · `book-closed` · `book-open` · `news` · `receipt` · `survey` · `certificate` · `print`

**Media**
`photo` · `film` · `camera` · `videocam` · `play` · `pause` · `stop` · `fast-forward` · `fast-rewind` · `volume-up` · `volume-down` · `volume-mute` · `headphones`

**Commerce & Finance**
`shopping-cart` · `shopping-bag` · `shopping-basket` · `credit-card` · `currency-dollar` · `currency-euro` · `money` · `wallet` · `receipt` · `discount` · `store` · `deliver` · `package` · `ticket`

**Charts & Analytics**
`chart` · `pie-chart` · `dashboard` · `trending-up` · `trending-down` · `sort-ascending` · `sort-descending` · `order-horizontal` · `order-vertical`

**Devices & Tech**
`desktop` · `monitor` · `device-smartphone` · `device-tablet` · `server` · `hard-drive` · `code` · `cog` · `interface` · `application` · `widget-add` · `wifi` · `wifi-off` · `cloud-download` · `cloud-upload` · `clouds`

**Navigation & Places**
`home` · `office` · `factory` · `globe` · `map` · `location-pin` · `compass` · `sign` · `door-enter` · `door-exit`

**Misc**
`search` · `star` · `heart` · `bolt` · `light` · `help` · `information` · `important` · `history` · `time` · `hour-glass` · `calendar` · `calendar-add` · `calendar-date` · `calendar-remove` · `calculator` · `paint` · `swatch` · `tune` · `translate` · `link` · `click-target` · `target` · `text-cursor` · `asterisk` · `scale` · `trophy` · `puzzle` · `bug` · `buoy` · `umbrella` · `airplane` · `launch` · `presentation` · `presentation-play` · `work` · `inbox-full` · `inbox-check` · `inbox-download` · `inbox-upload` · `mood-happy` · `mood-neutral` · `mood-sad` · `thumbs-up` · `thumbs-down` · `view-visible` · `view-hidden` · `battery-full` · `battery-half` · `thermostat-full` · `thermostat-half` · `brick` · `box` · `iframe`

---

## Working with Images

### Use good photos
Bad photos ruin a design. Options: hire a professional photographer for specific needs, or use high-quality stock photography (Unsplash for free). Never design with placeholder images planning to swap in phone photos later — it never works.

### Text on images: techniques for consistent contrast
The problem with text on photos isn't the text color — it's that photos have dynamic light and dark areas that fight any single text color. Solutions:
- **Overlay:** Semi-transparent black overlay tones down highlights (use with light text); white overlay brightens dark areas (use with dark text)
- **Lower image contrast:** Reduce contrast + compensate brightness. More control than an overlay, less dramatic.
- **Colorize the image:** Desaturate + lower contrast + add solid fill in "multiply" blend mode. Pairs image with your brand color.
- **Text shadow:** Large blur radius, no offset — looks like a subtle glow. Lets you preserve more image dynamics while adding local contrast where needed.

### Don't scale up icons past their intended size
Icons drawn at 16–24px look chunky and unprofessional at 3–4× their size. They lack the detail needed for large display. Solution: enclose the small icon in a larger shape with a background color. This fills the space at the right visual weight while keeping the icon at its intended size.

### Don't scale down screenshots
Shrinking a full-browser screenshot by 70% makes 16px type render at ~4px — unreadable. Instead:
- Take the screenshot at a smaller breakpoint (tablet layout uses less space)
- Use a partial/cropped screenshot
- For tight spaces: draw a simplified schematic version with lines replacing text

### Beware user-uploaded content
You can't control colors, composition, or aspect ratios.
- **Control shape and size:** Use fixed containers; center-crop with `object-fit: cover`. In CSS: make the image a `background-image` with `background-size: cover`.
- **Prevent background bleed:** When a user image has a background color similar to your UI, add a subtle `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1)` — an inner shadow that creates edge definition without clashing with the image colors. A semi-transparent inner border also works.

### Don't rely on images for layout structure
Images have unpredictable content. Always design the layout to look good with placeholder/missing images.

### Handling image aspect ratios
```css
.image-container {
  aspect-ratio: 16/9;
  overflow: hidden;
}
.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### Avatar / profile images
Always use `border-radius: 9999px` for circular avatars. Add a subtle ring: `ring-2 ring-white` (2px white border) so avatars don't bleed into colored backgrounds.



---

## Quick Reference: Decision Rules

### "Should I use a card here?"
- Card = when you need to visually group **unrelated** items that happen to be near each other
- Don't use cards just for decoration; use whitespace + dividers for related sections

### "What border radius should I use?"
- Playful / consumer: full rounded (pills) or large rounded (8–12px)
- Professional / enterprise: small rounded (4px) or square
- Be consistent — pick one and use it everywhere

### "Should this be a border or a shadow?"
- **Border** = defining a shape, separating adjacent elements, form inputs
- **Shadow** = floating above the page, interactive elements, modals, dropdowns
- Never use both on the same element unless intentional (e.g., border + inset shadow on inputs)

### "How do I make my UI look less amateurish?"
1. Use a consistent spacing scale (stop using arbitrary px values)
2. Add more whitespace
3. Use 2–3 font sizes instead of 6
4. Use real grays from your palette, not default browser gray
5. Remove default `outline` on focus AND replace it with a custom focus ring
6. Choose a consistent border-radius and stick to it

### "How many colors should my UI have?"
- 1 brand/primary color (with 8–10 shades)
- 1 gray scale (with 8–10 shades)  
- 2–4 semantic colors (green, red, yellow, blue)
- Total: ~40–50 named color values in your system
- Use the **brand color sparingly** — it has more impact when it's not everywhere

### Component default patterns (battle-tested)
| Component | Recommended default |
|-----------|-------------------|
| Button primary | Filled brand color, small rounded, padding py-2 px-4 |
| Button secondary | Outlined or soft bg, same radius |
| Input | Soft bg + bottom border OR thin border + small rounded |
| Badge | Soft background + full rounded |
| Alert | Left accent border + soft bg + icon |
| Nav active state | Bottom border (horizontal) or left border + soft bg (vertical) |
| Card | White bg + sm shadow + small rounded |
| Modal | xl shadow + dark overlay |
| Pagination | Page numbers + prev/next, no extra borders |

## Finishing Touches

### Supercharge the defaults
Look at what's already in your design and ask if it can be more interesting without adding new elements:
- **Bulleted lists:** Replace generic bullets with icons — checkmarks, arrows, or domain-specific icons (a padlock for a security features list)
- **Blockquotes/testimonials:** Make quotation marks a large visual element — increase size and change color
- **Links:** Custom underline that partially overlaps the text (colorful thick underline) adds polish without being overbearing
- **Form checkboxes/radios:** Replace browser defaults with brand-colored custom controls — just using your brand color for the selected state takes a form from boring to polished

### Add color with accent borders
One of the easiest ways to add visual flair without graphic design skills:
- Colored top border on a card
- Left border on an alert (classic "callout" pattern)
- Left border on active nav item
- Short colored underline beneath a headline
- Colored stripe across the very top of the entire layout

A colored rectangle is trivial to code and goes a long way toward making something feel "designed."

### Decorate your backgrounds
When everything else is right but a design still feels plain:
- **Colored background section:** Change one section's background color. Add a subtle gradient (two hues, no more than ~30° apart) for energy.
- **Repeating pattern:** Subtle geometric pattern (low contrast against background). Can be full-area or just along one edge. Resource: Hero Patterns.
- **Simple shape/illustration:** One or two geometric shapes or simple illustrations positioned in specific areas of the background.

Keep pattern/decoration contrast low — it should not compete with content.

### Empty states are a design opportunity
An empty state is the user's first interaction with a new feature. Don't show a blank screen or just a disabled table. Include: an illustration or image to set the tone, a brief explanation of what goes here, and a clear call-to-action. Hide supporting UI (tabs, filters) in empty states — actions that do nothing confuse users.

### Use fewer borders
Before reaching for a border, consider alternatives:
- **Box shadow:** Outlines an element subtly without looking as heavy as a border. Best when element isn't the same color as background.
- **Different background colors:** Adjacent sections with slightly different backgrounds create separation without any line.
- **Extra spacing:** Simply increasing gap between groups communicates separation without adding any element at all.

If you're already using different backgrounds AND a border, try removing the border — you probably don't need both.

### Think outside the box
Most design patterns can be reimagined. Before defaulting to the "standard" version:
- **Dropdowns:** Don't have to be a plain list of links — use sections, multiple columns, icons, supporting text
- **Tables:** Columns don't each have to contain one piece of data — combine related columns, add hierarchy within cells, include images or color-coded data
- **Radio buttons:** A stack of circles with labels is boring. Try **selectable card components** — each option as a clickable card with a selected state

---

## Leveling Up

### Find decisions you wouldn't have made
When you see a design you admire, ask: "What did the designer do that I never would have thought to do?" — an inverted datepicker background, a button positioned inside a text input, two different font colors in one headline. Collecting unintuitive-but-effective decisions is how you grow your toolkit.

### Rebuild interfaces you love
The best way to learn fine details is to recreate a design from scratch without looking at the developer tools. When your version looks different from the original, you'll discover specific tricks — "reduce line-height on headings," "add letter-spacing to uppercase text," "combine two shadows" — that you'll remember because you had to discover them yourself.

---


