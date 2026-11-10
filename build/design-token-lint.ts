/**
 * The lint half of ADR-010's locked theme: with Tailwind's defaults removed in
 * `src/styles/globals.css`, these blocks reject every other way into a component of a
 * colour, type size, radius, shadow or focus style. `eslint.config.ts` spreads them; the
 * fixture test beside this file proves each rule's message.
 */
import type { Linter } from "eslint"
import betterTailwindcss from "eslint-plugin-better-tailwindcss"
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/defaults"

/** Application code: tests assert on class names and may break the rules on purpose. */
const files = ["src/**/*.{ts,tsx}"]
const ignores = ["src/**/*.test.{ts,tsx}", "src/test/**"]

/** Any variants before a utility, and its `!` and negative prefixes. */
const VARIANTS = String.raw`^(?:.*:)?!?-?`
/** Utilities that take a colour (and, for `text`, a type size). */
const COLOUR = String.raw`(?:bg|text|border(?:-[xytrblse]|-[bi][se])?|divide|outline|ring(?:-offset)?|inset-ring|(?:inset-|drop-|text-)?shadow|fill|stroke|from|via|to|decoration|caret|accent|placeholder)`
/** A variant on the element's own focus state, or on a group's, peer's or child's. */
const FOCUS_VARIANT = String.raw`(?:[\w-]*-)?focus(?:-visible|-within)?(?:/[\w-]+)?:`
/** CSS properties that carry a colour, type, radius or shadow. */
const DESIGN_PROPERTY = String.raw`color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|border(?:-[a-z]+)*-radius|outline(?:-color)?|fill|stroke|stop-color|caret-color|accent-color|text-decoration(?:-color)?|font(?:-[a-z]+)?|line-height|letter-spacing|box-shadow|text-shadow`

const FOCUS_HINT =
  "use focus-visible:focus-fill (buttons), focus-ring (cards, inputs, menus) or focus-link (text links) (ADR-010)."

interface Restriction {
  pattern: string
  message: string
}

/** Class restrictions for every module; the first that matches a class reports it. */
const RESTRICTIONS: Restriction[] = [
  {
    pattern: String.raw`${VARIANTS}(text|decoration)-primary(?:/\S*)?!?$`,
    message:
      "$1-primary uses the primary fill as text, which fails contrast in the dark theme: use $1-link for link-blue text, or text-foreground (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}text-[\[(]`,
    message:
      "Arbitrary text value: use a type token (text-heading-xl … text-heading-xs, text-body, text-body-xs) or a semantic colour (text-foreground, text-link …) (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}((?:inset-|drop-|text-)?shadow)-[\[(]`,
    message:
      "Arbitrary $1 value: use a semantic shadow (shadow-control, shadow-popup) (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}(${COLOUR})-[\[(]`,
    message:
      "Arbitrary $1 value: use a semantic colour token from globals.css (bg-primary, border-input, ring-border …) (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}rounded(?:-[a-z]{1,2})?-[\[(]`,
    message:
      "Arbitrary radius: use a radius step (rounded-sm … rounded-4xl, rounded-full) (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}font-[\[(]`,
    message:
      "Arbitrary font: use font-sans or font-heading, and a weight such as font-medium (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}(leading|tracking)-`,
    message:
      "$1-* sets type by hand: line height and letter-spacing come with the type tokens (text-heading-*, text-body, text-body-xs) (ADR-010).",
  },
  {
    pattern: String.raw`^(?:.*:)?!?\[(${DESIGN_PROPERTY}):`,
    message:
      "Arbitrary $1: use the semantic utility for it (a colour, type, radius or shadow token) (ADR-010).",
  },
  {
    pattern: String.raw`^(?:.*:)?!?\[--[\w-]+:`,
    message:
      "Custom properties are set in globals.css, never per component (ADR-010).",
  },
  {
    pattern: String.raw`${VARIANTS}${COLOUR}-[^\s/]+/\S+$`,
    message:
      "Opacity modifier on a colour: use a semantic tint token, or add one to globals.css with a contrast pair (ADR-010); opacity-* on the whole element stays allowed.",
  },
  {
    pattern: String.raw`^(?:.*:)?dark:(?:.*:)?!?-?${COLOUR}(?:-|!?$)`,
    message:
      "dark: colour override: semantic tokens switch theme in globals.css's .dark block, so use the token alone (ADR-010).",
  },
  {
    pattern: String.raw`\.dark(?![a-zA-Z0-9-])`,
    message:
      "Theme selector in a class: semantic tokens switch theme in globals.css's .dark block (ADR-010).",
  },
  {
    pattern: String.raw`^(?:.*:)?${FOCUS_VARIANT}(?:.*:)?!?-?(?:ring|inset-ring|outline|shadow)(?:-|!?$)`,
    message: `Ad-hoc focus style: ${FOCUS_HINT}`,
  },
]

/**
 * In features, layout and the rest of the app, an element's own focus state is styled
 * only by a focus utility; layout under it (the skip link's position) stays allowed.
 * Shared components (`components/ui`) may also colour a highlighted menu item, and a
 * group's focus may restyle a child (a card's chevron).
 */
const OWN_FOCUS_RESTRICTION: Restriction = {
  pattern: String.raw`^(?:.*:)?(?:has-|not-)?focus(?:-visible|-within)?:(?:.*:)?!?-?(?:${COLOUR}|underline|no-underline|font|rounded|opacity)(?:-|!?$)`,
  message: `Only a focus utility styles focus here: ${FOCUS_HINT}`,
}

/**
 * Class lists are linted where the plugin finds them by default (`className`, `cn()`,
 * `cva()` …) and in variables named `…Classes`, e.g. a map from state to classes.
 */
const selectors = [
  ...getDefaultSelectors(),
  {
    kind: "variable",
    name: String.raw`^\w*[cC]lasses$`,
    match: [{ type: "strings" }, { type: "objectValues" }],
  },
]

/** JavaScript names of the inline-style properties `DESIGN_PROPERTY` lists. */
const STYLE_KEY = String.raw`/^(?:color|background(?:Color|Image)?|border(?:Top|Right|Bottom|Left|Block|Inline)?(?:Start|End)?(?:Color)?|border\w*Radius|outline(?:Color)?|fill|stroke|stopColor|caretColor|accentColor|textDecoration(?:Color)?|font\w*|lineHeight|letterSpacing|boxShadow|textShadow)$/`
/** The same properties written in CSS (kebab) case, as a string key. */
const STYLE_CSS_KEY = String.raw`/^(?:${DESIGN_PROPERTY})$/`
/** Where an object is a style: a `style` attribute, or typed as `CSSProperties`. */
const STYLE_OBJECT = [
  'JSXAttribute[name.name="style"]',
  ...["TSAsExpression", "TSSatisfiesExpression"].flatMap((node) => [
    `${node}[typeAnnotation.typeName.name="CSSProperties"]`,
    `${node}[typeAnnotation.typeName.right.name="CSSProperties"]`,
  ]),
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name="CSSProperties"]',
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.right.name="CSSProperties"]',
].join(", ")
/** A value an SVG paint attribute may hold that is not a colour. */
const PAINT_KEYWORD = String.raw`/^(?:none|currentColor|inherit|transparent|url\(.+\))$/`
const PAINT_ATTRIBUTE = String.raw`/^(?:fill|stroke|color|stopColor|stop-color|floodColor|flood-color|lightingColor|lighting-color)$/`
const PRIMITIVE = String.raw`/--(?:nhsw|app-dark)-/`

/** `no-restricted-syntax`: design values that bypass classes (S4). */
const backDoors = [
  {
    selector: `:matches(${STYLE_OBJECT}) Property[key.name=${STYLE_KEY}]`,
    message:
      "Design property in an inline style: use a semantic utility class; inline styles are for layout only (ADR-010).",
  },
  {
    selector: `:matches(${STYLE_OBJECT}) Property[key.value=${STYLE_CSS_KEY}]`,
    message:
      "Design property in an inline style: use a semantic utility class; inline styles are for layout only (ADR-010).",
  },
  {
    selector: String.raw`:matches(${STYLE_OBJECT}) Property[key.value=/^--/]:not([value.value=/^var\(--[\w-]+\)$/])`,
    message:
      "A custom property in an inline style may only map onto a semantic token, as var(--token) (ADR-010).",
  },
  {
    selector: `JSXAttribute[name.name=${PAINT_ATTRIBUTE}] > Literal:not([value=${PAINT_KEYWORD}])`,
    message:
      "Literal colour in an SVG attribute: use currentColor with a semantic text-* class (ADR-010).",
  },
  {
    selector: `JSXAttribute[name.name=${PAINT_ATTRIBUTE}] > JSXExpressionContainer > :matches(Literal:not([value=${PAINT_KEYWORD}]), TemplateLiteral)`,
    message:
      "Literal colour in an SVG attribute: use currentColor with a semantic text-* class (ADR-010).",
  },
  {
    selector: `:matches(Literal[value=${PRIMITIVE}], TemplateElement[value.raw=${PRIMITIVE}])`,
    message:
      "A --nhsw-* or --app-dark-* primitive outside globals.css: use the semantic token built on it (ADR-010).",
  },
]

function restrictedClasses(
  extra: Restriction[] = [],
): ["error", { restrict: Restriction[] }] {
  return ["error", { restrict: [...extra, ...RESTRICTIONS] }]
}

export const designTokenRules: Linter.Config[] = [
  {
    files,
    ignores,
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/styles/globals.css",
        selectors,
      },
    },
    rules: {
      // Sonner's marker classes, which no stylesheet styles.
      "better-tailwindcss/no-unknown-classes": [
        "error",
        { ignore: ["^toaster$", "^cn-toast$"] },
      ],
      "better-tailwindcss/no-restricted-classes": restrictedClasses(),
      "no-restricted-syntax": ["error", ...backDoors],
    },
  },
  {
    files,
    ignores: [...ignores, "src/components/ui/**"],
    rules: {
      "better-tailwindcss/no-restricted-classes": restrictedClasses([
        OWN_FOCUS_RESTRICTION,
      ]),
    },
  },
]
