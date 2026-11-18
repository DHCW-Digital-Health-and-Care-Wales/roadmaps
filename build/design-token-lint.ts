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
/** An arbitrary variant whose selector holds a focus state: `[&:focus-visible]:`. */
const ARBITRARY_FOCUS_VARIANT = String.raw`(?:[\w-]*-)?\[\S*?:focus\S*?\]:`
/** Utilities that set how something looks, rather than where it sits. */
const LOOK = String.raw`(?:${COLOUR}|underline|no-underline|font|rounded|opacity)(?:-|!?$)`

const SIDES = ["top", "right", "bottom", "left", "block", "inline"].flatMap(
  (side) =>
    side === "block" || side === "inline"
      ? [side, `${side}-start`, `${side}-end`]
      : [side],
)
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"]
const LOGICAL_CORNERS = ["start-start", "start-end", "end-start", "end-end"]
/** CSS properties that carry a colour, type, radius or shadow, beside every `font-*`. */
const DESIGN_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "background-image",
  "border",
  "border-color",
  ...SIDES.flatMap((side) => [`border-${side}`, `border-${side}-color`]),
  "border-radius",
  ...[...CORNERS, ...LOGICAL_CORNERS].map(
    (corner) => `border-${corner}-radius`,
  ),
  "outline",
  "outline-color",
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
  "lighting-color",
  "column-rule-color",
  "text-emphasis-color",
  "scrollbar-color",
  "caret-color",
  "accent-color",
  "text-decoration",
  "text-decoration-color",
  "font",
  "line-height",
  "letter-spacing",
  "box-shadow",
  "text-shadow",
]
/** `background-color` as a style object key: `backgroundColor`. */
const camelCase = (property: string) =>
  property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
/** The design properties as regex alternatives, in CSS (kebab) and JavaScript case. */
const CSS_PROPERTIES = [
  ...DESIGN_PROPERTIES,
  String.raw`font(?:-[a-z]+)+`,
].join("|")
const JS_PROPERTIES = [
  ...DESIGN_PROPERTIES.map(camelCase),
  String.raw`font[A-Z]\w*`,
].join("|")

const FOCUS_HINT =
  "use focus-visible:focus-fill (buttons, menu items), focus-ring (cards, inputs) or focus-link (text links) (ADR-010)."

interface Restriction {
  pattern: string
  message: string
}

/** Class restrictions for every module; the first that matches a class reports it. */
const RESTRICTIONS: Restriction[] = [
  {
    pattern: String.raw`${VARIANTS}(text|decoration)-primary(?:-hover)?(?:/\S*)?!?$`,
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
    pattern: String.raw`${VARIANTS}bg-(?:linear|radial|conic)(?:-[\w-]+?)?-[\[(]`,
    message:
      "Arbitrary gradient: build it from semantic colours (bg-linear-to-r from-muted to-card) (ADR-010).",
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
    pattern: String.raw`^(?:.*:)?!?\[(${CSS_PROPERTIES}):`,
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
  {
    // Sorts after the focus utilities, so it would replace their fill or ring.
    pattern: String.raw`^(?:.*:)?${ARBITRARY_FOCUS_VARIANT}(?:.*:)?!?-?${LOOK}`,
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
  pattern: String.raw`^(?:.*:)?(?:has-|not-)?focus(?:-visible|-within)?:(?:.*:)?!?-?${LOOK}`,
  message: `Only a focus utility styles focus here: ${FOCUS_HINT}`,
}

/** A variable whose strings lint reads as classes. */
const CLASSES_VARIABLE = String.raw`^\w*[cC]lasses$`

/**
 * Class lists are linted where the plugin finds them by default (`className`, `cn()`,
 * `cva()` …), in the `className` a cva helper takes (`buttonVariants({ className })`),
 * and in variables named `…Classes`, e.g. a map from state to classes.
 */
const selectors = [
  ...getDefaultSelectors(),
  {
    kind: "callee",
    name: String.raw`^\w+Variants$`,
    match: [{ type: "objectValues", path: "^(?:class|className)$" }],
  },
  {
    kind: "variable",
    name: CLASSES_VARIABLE,
    match: [{ type: "strings" }, { type: "objectValues" }],
  },
]

/** A design property as a style object key, in JavaScript or CSS case. */
const STYLE_KEY = `/^(?:${JS_PROPERTIES})$/`
const STYLE_CSS_KEY = `/^(?:${CSS_PROPERTIES})$/`
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

/** A `style` attribute's value, and an object literal there, perhaps cast. */
const STYLE_VALUE = 'JSXAttribute[name.name="style"] > JSXExpressionContainer'
const STYLE_LITERAL = [
  "ObjectExpression",
  'TSAsExpression[expression.type="ObjectExpression"]',
  'TSSatisfiesExpression[expression.type="ObjectExpression"]',
].join(", ")
/** A string an SVG paint attribute may not hold: a colour, not a keyword or `url(#…)`. */
const PAINT_STRING = String.raw`:matches(Literal[raw=/^["']/]:not([value=${PAINT_KEYWORD}]), TemplateLiteral:not([quasis.0.value.raw=/^url\(#/]))`
const PAINT_VALUE = `JSXAttribute[name.name=${PAINT_ATTRIBUTE}] > JSXExpressionContainer`
const STYLE_MESSAGE =
  "Design property in an inline style: use a semantic utility class; inline styles are for layout only (ADR-010)."
const STYLE_FORM_MESSAGE =
  "Write an inline style as an object literal in its style attribute, without spreads, so lint can check its properties (ADR-010)."
const PAINT_MESSAGE =
  "Literal colour in an SVG attribute: use currentColor with a semantic text-* class (ADR-010)."

/** A variable lint reads classes from: `…Classes`, or one of the plugin's default names. */
const LINTED_VARIABLE = String.raw`${CLASSES_VARIABLE}|^classNames?$|^styles?$`
/** Where a class list reaches an element: a `className` attribute's value, `cn()`'s arguments. */
const CLASS_VALUE = String.raw`:matches(JSXAttribute[name.name="className"] > JSXExpressionContainer > .expression, CallExpression[callee.name="cn"] > .arguments)`
/** A part of a value that is itself the value: a branch a condition chooses, not its test. */
const VALUE_PART = String.raw`:matches(ConditionalExpression > .consequent, ConditionalExpression > .alternate, LogicalExpression > .right, LogicalExpression[operator!="&&"] > .left, TemplateLiteral > .expressions, ArrayExpression > .elements)`
/** A class value, or a part of one, two levels deep (`a && (b ? ROWS : "")`). */
const CLASS_VALUES = `:matches(${CLASS_VALUE}, ${CLASS_VALUE} > ${VALUE_PART}, ${CLASS_VALUE} > ${VALUE_PART} > ${VALUE_PART})`
/**
 * A name lint reads no classes from, alone or as a lookup's root (`INDENTS[level]`).
 * Only `…Classes` is read as a map, one level down too; a forwarded `props.className`
 * was linted where it was written.
 */
const UNLINTED_NAME = String.raw`:matches(Identifier:not([name=/${LINTED_VARIABLE}|^undefined$/]), MemberExpression:not([object.name=/${CLASSES_VARIABLE}/], [object.object.name=/${CLASSES_VARIABLE}/], [property.name="className"]))`

/** `no-restricted-syntax`: design values that bypass classes (S4). */
const backDoors = [
  {
    selector: `:matches(${STYLE_OBJECT}) Property[key.name=${STYLE_KEY}]`,
    message: STYLE_MESSAGE,
  },
  {
    selector: `:matches(${STYLE_OBJECT}) Property[key.value=${STYLE_CSS_KEY}]`,
    message: STYLE_MESSAGE,
  },
  // A style lint can read: an object literal, perhaps cast or chosen by a condition.
  {
    selector: `${STYLE_VALUE} > :not(ObjectExpression, ConditionalExpression, TSAsExpression, TSSatisfiesExpression)`,
    message: STYLE_FORM_MESSAGE,
  },
  {
    selector: `${STYLE_VALUE} > ConditionalExpression > :not(${STYLE_LITERAL}, Identifier[name="undefined"]).consequent`,
    message: STYLE_FORM_MESSAGE,
  },
  {
    selector: `${STYLE_VALUE} > ConditionalExpression > :not(${STYLE_LITERAL}, Identifier[name="undefined"]).alternate`,
    message: STYLE_FORM_MESSAGE,
  },
  {
    selector: `${STYLE_VALUE} > :matches(TSAsExpression, TSSatisfiesExpression) > :not(ObjectExpression).expression`,
    message: STYLE_FORM_MESSAGE,
  },
  {
    selector: `:matches(${STYLE_OBJECT}) SpreadElement`,
    message: STYLE_FORM_MESSAGE,
  },
  {
    selector: String.raw`:matches(${STYLE_OBJECT}) Property[key.value=/^--/]:not([value.value=/^var\(--[\w-]+\)$/])`,
    message:
      "A custom property in an inline style may only map onto a semantic token, as var(--token) (ADR-010).",
  },
  {
    selector: `JSXAttribute[name.name=${PAINT_ATTRIBUTE}] > Literal:not([value=${PAINT_KEYWORD}])`,
    message: PAINT_MESSAGE,
  },
  {
    selector: `${PAINT_VALUE} > ${PAINT_STRING}`,
    message: PAINT_MESSAGE,
  },
  {
    // A value a condition chooses, `fill={active ? "red" : "none"}`, but not its test.
    selector: `${PAINT_VALUE} :matches(ConditionalExpression > ${PAINT_STRING}.consequent, ConditionalExpression > ${PAINT_STRING}.alternate, LogicalExpression > ${PAINT_STRING})`,
    message: PAINT_MESSAGE,
  },
  {
    selector: `:matches(Literal[value=${PRIMITIVE}], TemplateElement[value.raw=${PRIMITIVE}])`,
    message:
      "A --nhsw-* or --app-dark-* primitive outside globals.css: use the semantic token built on it (ADR-010).",
  },
  {
    // Lint reads a variable's classes by its name alone, so a class list in any other
    // variable went unchecked: STY-052's `IN_FLOW`, STY-054's `ITEM_CLASSES` and
    // `ROADMAP_ROWS`. Not covered: a name passed to `cva()` or `…Variants({ className })`,
    // a callback's parameter or a function named `…Classes`, a cast, a spread, and a
    // third level of nesting. Review by 2027-02-16 whether it has caught any since.
    selector: `${UNLINTED_NAME}${CLASS_VALUES}`,
    message:
      "Class list in a variable lint cannot read: name the variable …Classes, so lint checks its classes (ADR-010).",
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
      "better-tailwindcss/no-unknown-classes": "error",
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
