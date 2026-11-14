# Campus Design System

Direction: **neo-brutalism**. The app should look printed and stamped, not rendered. Structure is
visible, color is flat and loud, and nothing is soft. Decision and reasoning: `docs/decisions.md` D-003.
All tokens live in `apps/mobile/src/ui/theme.ts`; screens never hardcode a color, size or font.

## Rules
1. **Outlines.** Every surface (card, button, input, avatar, tag) has a 3 px solid ink border.
2. **Hard shadows.** Raised elements sit on a solid ink block offset 4 px right and 4 px down. No blur, ever.
3. **Press = push.** A pressed button moves 4 px onto its shadow, so it feels like a physical key.
4. **Corners are square.** Radius 0 everywhere, including avatars.
5. **Flat color.** No gradients, no transparency except the disabled state.
6. **Type does the talking.** Screen titles are Archivo Black, uppercase, tight. Labels are uppercase with letter spacing. Body is Archivo.
7. **School color = identity.** Each school has one color. It fills the profile banner, the avatar
   background and audience tags, so the university's structure is visible at a glance.
8. **One accent per screen.** Yellow is the action color. Other colors mark meaning, not decoration.

## Color
| Token | Hex | Use |
|---|---|---|
| ink | `#0B0B0B` | Borders, shadows, text |
| paper | `#FFFDF6` | Screen background |
| white | `#FFFFFF` | Cards, inputs |
| yellow | `#FFE14D` | Primary action, active tab, focus |
| mint | `#1FE0A0` | Online, success, "sent by me" bubbles |
| red | `#FF4D4D` | Errors, destructive actions |
| gray | `#6B6B6B` | Secondary text |
| blue `#3D5AFE`, violet `#9B5CFF`, pink `#FF3D8B`, orange `#FF7A1A` | | School colors (stored on the school record) |

Text on yellow, mint, white and paper is ink. Text on blue, violet, pink, orange and red is ink for
large type and white for small type; both pass contrast at the sizes used.

## Type
| Variant | Font | Size / line | Notes |
|---|---|---|---|
| display | Archivo Black | 44 / 44 | Uppercase, letter spacing -1 |
| title | Archivo Black | 28 / 30 | Uppercase |
| heading | Archivo Bold | 20 / 24 | |
| body | Archivo Medium | 16 / 22 | |
| small | Archivo Medium | 13 / 18 | |
| label | Archivo Bold | 12 / 14 | Uppercase, letter spacing 1.2 |

## Spacing
4, 8, 12, 16, 24, 32. Screen padding is 16. Touch targets are at least 48 px tall.

## Components (`apps/mobile/src/ui`)
`Txt`, `Block` (bordered surface with hard shadow), `Button`, `Input`, `Avatar`, `Tag`, `Choice`
(selectable chip), `Screen`, `StateViews` (loading, error with retry, empty), `RemoteImage`.

## States
Every data screen has four states: loading (a blinking ink bar and a label), error (red block with
the message and a Retry button), empty (a short uppercase line saying what will appear here), and content.

## Accessibility
Every pressable has a role and a label. Disabled and busy states are announced. Minimum body size is 16.
