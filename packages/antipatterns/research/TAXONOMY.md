# Taxonomy of AI design tells

Generated from rules.json v1.0.0 on 2026-10-02. 41 rules with pairs and detection, plus 16 motion rules mirrored from @brandcloud/motion (documented only).
Ids are stable: never renumber, only add. Source ids are listed with title, author, date and URL in research/sources.json and rules.json `sources`.

## Colour and gradient (GRAD)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-GRAD-01 | Hue-shifting 'AI' gradient | high | actions, pricing | S01 S02 S04 S05 S07 S08 S09 S10 S11 S12 S14 S15 S16 S19 S20 S22 S23 S28 S30 S31 S32 S34 S37 |
| AP-GRAD-02 | Gradient text and gradient accent words | high | hero, headings | S09 S11 S19 S20 S21 S26 S36 |
| AP-GRAD-03 | Blurred glow blobs behind the hero | high | hero | S02 S03 S05 S15 S19 S20 S22 S26 S34 |
| AP-GRAD-04 | Mesh, aurora or rainbow backgrounds | medium | sections | S19 S21 |
| AP-GRAD-05 | Coloured glows on everything | medium | page | S04 S23 |
| AP-GRAD-06 | Gradient borders on cards | medium | pricing, cards | S19 |
| AP-GRAD-07 | Glassmorphism on text containers | medium | cards | S04 S06 S09 S19 S20 S22 S23 S26 S28 |
| AP-GRAD-08 | Dark mode with neon accents | medium | page | S02 S03 S04 S07 S11 S20 S25 S28 S29 |

## Layout (LAY)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-LAY-01 | Everything centred | medium | page | S04 S08 S16 S20 S29 S34 |
| AP-LAY-02 | Walls of identical icon cards | high | features | S01 S02 S04 S05 S08 S13 S15 S16 S19 S21 S23 S25 S34 |
| AP-LAY-03 | Bento grid of rounded tiles | low | features | S22 |
| AP-LAY-04 | The template section order | medium | page | S13 S14 S19 S22 S34 |
| AP-LAY-05 | Same large radius on every box | low | cards, forms | S01 S07 S15 S16 S23 S30 S31 |
| AP-LAY-06 | 01 / 02 / 03 numbered steps | low | process | S04 S05 S21 |

## Typography (TYPE)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-TYPE-01 | Untouched default type and greys | medium | page | S01 S04 S07 S08 S14 S15 S16 S22 S25 S31 |
| AP-TYPE-02 | Mono or tracked caps kicker above headings | medium | headings | S04 S21 S25 |
| AP-TYPE-03 | Accent words in headlines (colour or italic serif) | medium | hero, headings | S04 S21 S25 |

## Components (COMP)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-COMP-01 | Eyebrow pill above the H1 | high | hero | S04 S08 S19 S21 S25 S26 S36 |
| AP-COMP-02 | Chip walls | medium | features, lists |  |
| AP-COMP-03 | Floating chips around the hero visual | medium | hero | S26 |
| AP-COMP-04 | Icons in tinted rounded squares | medium | features, lists | S07 S09 S19 S22 |
| AP-COMP-05 | Emoji bullets and emoji headings | medium | lists | S02 S04 S05 S09 S20 S23 S34 |
| AP-COMP-06 | Component library defaults left untouched | medium | page | S04 S06 S07 S08 S09 S19 S20 S22 S31 S36 |
| AP-COMP-07 | Cards with a coloured side or top stripe | medium | cards | S02 S04 S05 S06 S19 |

## Imagery and decoration (IMG)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-IMG-01 | Fake UI built from divs | high | hero | S19 S26 S29 |
| AP-IMG-02 | Decorative grid or dot pattern behind the hero | medium | hero | S36 |
| AP-IMG-03 | Sparkles as the 'AI' signifier | low | actions | S09 S27 |

## Motion (MOT)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-MOT-01 | Everything fades up on scroll | medium | page | S26 S36 |
| AP-MOT-02 | Staggered entrance on every card | low | lists | S26 S36 |
| AP-MOT-03 | Hover lift and scale on every card | low | cards |  |
| AP-MOT-04 | Endless floating and pulsing decoration | medium | hero | S19 S21 |
| AP-MOT-05 | Infinite logo marquee | high | proof | S19 |
| AP-MOT-06 | Cursor-following glow or spotlight | medium | page |  |
| AP-MOT-07 | Typewriter or rotating-word headline | medium | hero |  |
| AP-MOT-08 | Parallax-scrolling decorative shapes | medium | hero |  |
| AP-MOT-09 | Purposeless spinning hero object | high | hero |  |

## Trust and fake proof (TRUST)

| Id | Tell | Severity | Section types | Sources |
|---|---|---|---|---|
| AP-TRUST-01 | 'Trusted by' strip of placeholder logos | high | proof | S19 |
| AP-TRUST-02 | Inflated stat band | high | proof | S04 S19 S21 S26 |
| AP-TRUST-03 | Avatar stack with 'Loved by 10,000+' | medium | hero, proof | S19 S21 S23 |
| AP-TRUST-04 | Placeholder testimonials | high | proof | S19 S21 S23 |
| AP-TRUST-05 | Template and builder leftovers | high | footer, page | S07 S22 S23 S24 |

## Motion rules mirrored from @brandcloud/motion (not yet detected here)

| Id | Tell | Severity |
|---|---|---|
| AP-MOT-20 | No reduced-motion handling | high |
| AP-MOT-21 | Animating layout properties | medium |
| AP-MOT-22 | transition: all | low |
| AP-MOT-23 | Slow interface motion | medium |
| AP-MOT-24 | Bouncy overshoot on everything | low |
| AP-MOT-25 | Scroll hijacking and smooth-scroll libraries | high |
| AP-MOT-26 | Choreographed hero intro | medium |
| AP-MOT-27 | Animated gradient or mesh background | high |
| AP-MOT-28 | Every number counts up | low |
| AP-MOT-29 | Cursor-tilt and magnetic elements | medium |
| AP-MOT-30 | Animation loops running off screen | medium |
| AP-MOT-31 | Letter-by-letter or blur-in headline | medium |
| AP-MOT-32 | Preloader or splash animation | high |
| AP-MOT-33 | Auto-playing motion with no pause | high |
| AP-MOT-34 | Meaning only available on hover | medium |
| AP-MOT-35 | Blur and glass entrances | low |

## Gradient policy

Gradients are allowed when they model light on a physical object. Gradients used as decoration with no light logic are the AI tell.

Good:
- Single hue family, small hue spread (under about 20 degrees), e.g. #3b82f6 to #1d4ed8
- Lighter at the top, deeper at the bottom, small angle (180deg or close to it)
- Thin white sheen or inset top highlight
- Soft same-hue shadow or halo underneath with a vertical offset
- Used on actions (buttons), offer level tiles and occasionally one brand-colour section

Bad:
- Purple or violet to pink or cyan gradients
- Rainbow, conic, mesh or aurora backgrounds
- Gradient text or gradient accent words
- Blurred glow blobs behind the hero
- Gradient borders on every card
- Glassmorphism on anything holding text
- Centred coloured glows on many elements
- Hue-shifting gradients with no light logic
