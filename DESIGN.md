---
name: Culinary Editorial
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#54433e'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#87736d'
  outline-variant: '#dac1ba'
  surface-tint: '#944931'
  primary: '#944931'
  on-primary: '#ffffff'
  primary-container: '#d67d61'
  on-primary-container: '#551905'
  inverse-primary: '#ffb59e'
  secondary: '#4f6443'
  on-secondary: '#ffffff'
  secondary-container: '#cfe7bd'
  on-secondary-container: '#536947'
  tertiary: '#645e4b'
  on-tertiary: '#ffffff'
  tertiary-container: '#9c947e'
  on-tertiary-container: '#322d1c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#3a0b00'
  on-primary-fixed-variant: '#76321c'
  secondary-fixed: '#d2eac0'
  secondary-fixed-dim: '#b6cea5'
  on-secondary-fixed: '#0e2006'
  on-secondary-fixed-variant: '#384c2d'
  tertiary-fixed: '#ece2c9'
  tertiary-fixed-dim: '#cfc6ae'
  on-tertiary-fixed: '#201b0c'
  on-tertiary-fixed-variant: '#4c4634'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  headline-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The brand personality of this design system is "The Thoughtful Epicurean." It aims to evoke a sense of calm, culinary inspiration, and effortless organization. The target audience includes home cooks who appreciate the aesthetics of high-end food journalism and desire a tool that feels more like a curated cookbook than a utility app.

The design style follows an **Editorial Minimalism** approach. It prioritizes high-quality food photography by treating the UI as a frame rather than a focal point. Heavy use of white space, sophisticated typography, and a "breathable" layout ensure that the user feels invited rather than overwhelmed by complex ingredient lists or dense instructions.

## Colors

This design system utilizes a palette inspired by natural ingredients and earth-toned kitchenware. 

- **Primary (Terracotta):** Used for primary actions, active states, and accents that stimulate appetite and warmth.
- **Secondary (Sage Green):** Used for health-related tags, herb-centric categories, and successful "completed" states.
- **Neutral (Charcoal & Warm White):** The background should use a soft, warm off-white (#FAF9F6) rather than a clinical pure white to maintain the organic feel. Text utilizes a deep charcoal for high contrast without the harshness of pure black.
- **Surface Tints:** Use highly desaturated versions of the primary and secondary colors for background fills in chips or recipe categories.

## Typography

Typography is the backbone of this design system, ensuring recipes are legible while cooking. 

- **Headlines:** Use **Epilogue** to provide a modern, geometric, and slightly editorial feel. It should be used for recipe titles and section headers.
- **Body & Labels:** Use **Plus Jakarta Sans** for its friendly, open apertures and exceptional legibility. Its soft curves complement the natural color palette.
- **Rhythm:** Maintain a generous line height (1.6) for body text to ensure users can easily track their place in a recipe from a distance. Use uppercase for `label-sm` to create a clear distinction for metadata like "PREP TIME" or "CALORIES."

## Layout & Spacing

This design system employs a **Fluid Grid** with a strict 8px baseline rhythm. 

- **Margins:** A generous 24px side margin on mobile and 40px+ on tablet ensures content doesn't feel cramped against the screen edges.
- **Rhythm:** Use `lg` (40px) spacing between major sections (e.g., between the Ingredients list and Instructions) to provide visual breathing room. 
- **Recipe Cards:** Cards should span the full width of the container in a single column on mobile to maximize the impact of food photography, moving to a 2-column or 3-column layout on larger screens.

## Elevation & Depth

To maintain a clean and modern aesthetic, depth is communicated through **Tonal Layers** and **Ambient Shadows**.

- **Surface Levels:** The primary background is the lowest level. Recipe cards and input fields sit on the next level with a very subtle, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)).
- **Interaction:** Upon hover or press, cards should slightly lift with a more pronounced shadow. 
- **Overlays:** Use a soft 20% black gradient overlay on the bottom third of images when white text needs to be placed directly over photography.
- **Glassmorphism:** Use a light backdrop blur (8px) for sticky navigation bars or ingredient "floating" headers to maintain a sense of context with the background image.

## Shapes

The shape language is "Softly Geometric."

- **Cards & Buttons:** A radius of 0.5rem (8px) is the standard for cards and main buttons, offering a balance between a clean architectural look and a friendly hand-feel.
- **Pills:** Tags for dietary restrictions (e.g., "Vegan", "Gluten-Free") should use a fully rounded/pill shape to distinguish them from interactive buttons.
- **Imagery:** Photography should always feature slightly rounded corners (0.5rem) to match the UI, unless it is a full-bleed header image.

## Components

- **Buttons:** Primary buttons use the Terracotta fill with white text. Secondary buttons use a Sage Green ghost style (outline only). All buttons feature a 1px soft border.
- **Recipe Cards:** These are the hero components. They must feature a large image area (aspect ratio 4:3), followed by a title in `headline-md` and a row of meta-data chips.
- **Chips:** Small, rounded-pill containers for categories. Use low-saturation background tints (e.g., a very light Sage background for a "Healthy" tag).
- **Ingredient Lists:** Use a clean list style with a subtle horizontal separator (1px light grey). Checkboxes for "completed" ingredients should use the Sage Green color when active.
- **Interactive Steps:** Instruction steps should be numbered using `headline-sm` in Terracotta to act as clear visual anchors.
- **Icons:** Use thin-stroke (2px), rounded-end icons. Icons should be functional and simple—avoiding overly illustrative styles to keep the focus on the photography.