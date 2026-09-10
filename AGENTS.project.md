# BODYYY Chart — this is the only app in this project

This workspace **is** BODYYY Chart (three Ys). There is one product. Do not scaffold a second app, a GitHub-draft clone, or a simplified rebuild.

## Source of truth

- Live code: `src/components/chart/*`, `src/lib/chart/*`, `public/figures/*`
- Original backup the owner uploaded: `attachments/grok-workspace.zip`
- If files are ever missing, **restore from that zip**. Do not rewrite a stub.

## Never

- Do not create another body-chart app alongside this one
- Do not replace the original with a shorter rewrite
- Do not invert the chrome when switching Black/White (canvas + figures only)
- Do not draw the product name or `© 2026 AidenPYT. All rights reserved.` on PNG/PDF
- Do not send patient data to a server (local JSON only)

## Keep

- Four figures in one row: Anterior → Posterior → Left lateral → Right lateral
- View ticks hide/reflow those four; marks stay in JSON
- Header title: BODYYY Chart
- Share: title BODYYY Chart · description Quiet Charting👌

## UI / layout (every change)

Think as a UI layout designer on **phone, tablet, and PC** before shipping. Two widths only: `<768` and `≥768`. Do not invent a third layout.

- **Fill the chart.** Previous and Recent are one full plate. Only Compare splits (stack on phone, side-by-side on PC). Never leave a dead black band under a single plate; the canvas flexes, figures stay 4-across (letterbox, no stretch).
- **New chrome is compact.** Header, segmented control, legal line, and Compare tabs must not steal stamp space. Clinical stamps stay 44px; mode tabs can be smaller on phone (~32px).
- **Overlays always have an exit.** Details/sheets/dialogs: sticky Back (←) top-right, tap-outside closes, never cover 100% of the bodies on phone. Done/Back must not scroll away.
- **Labels are one word.** Compare corners: Previous / Recent only — no filename glued on (no “previous previous”).
- **Hit targets vs pan.** Header swipe and symbol-bar arrows must not pan the chart. Swipe needs distance so a tap still taps.
- **Safe area.** Mobile legal and bottom chrome sit above the home indicator. Do not clip Select / Pain / recents / Symbols.
- **Theme.** Black/White changes the plate only, never the chrome.
- **Before done:** check phone portrait, phone landscape (≥768 split), and desktop. Watch for clipped buttons, stacked duplicate labels, sheets that trap the user, and Compare leaking into single-pane modes.
