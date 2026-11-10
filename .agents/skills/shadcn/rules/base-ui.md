# Base UI

This repository's primitives are on Base UI (ADR-0005), and the root `components.json` is the `base-nova` style, so `pnpm dlx shadcn@latest info` reads `base: base` and `add` fetches the Base UI variant into `src/components/ui/`. There is no Radix here: no `@radix-ui/*` import and no `asChild` prop. Where a generated file in `src/components/ui/` differs from the registry's, the generated file is what runs; keep it close to upstream.

Select, ToggleGroup, Slider and Accordion are not installed here yet; their rules below are the registry's and apply once `pnpm dlx shadcn@latest add` brings them in.

## Contents

- Composition: `render`
- Button / trigger as non-button element
- Select (items prop, placeholder, positioning, multiple, object values)
- ToggleGroup (`multiple`)
- Slider (scalar value)
- Accordion (`multiple`, `defaultValue`)

---

## Composition: `render`

`render` replaces the default element with another, or composes it with another component. Don't wrap triggers in extra elements.

**Incorrect:**

```tsx
<DialogTrigger>
  <div>
    <Button>Open</Button>
  </div>
</DialogTrigger>
```

**Incorrect:** `asChild` is not a prop here.

```tsx
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>
```

**Correct:**

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

This applies to all trigger and close components: `DialogTrigger`, `SheetTrigger`, `AlertDialogTrigger`, `DropdownMenuTrigger`, `PopoverTrigger`, `TooltipTrigger`, `CollapsibleTrigger`, `DialogClose`, `SheetClose`, `NavigationMenuLink`, `BreadcrumbLink`, `SidebarMenuButton`, `Badge`, `Item`.

In this repository `Button` is Base UI's `Button` with the registry's variants (`src/components/ui/button.tsx`), so it takes `render` like any Base UI part.

```tsx
<DropdownMenuTrigger render={<Button variant="outline" />}>
  Menu
</DropdownMenuTrigger>
```

---

## Button / trigger as non-button element

When a registry component's `render` changes a Base UI part to a non-button (`<a>`, `<span>`), add `nativeButton={false}`.

**Incorrect:** missing `nativeButton={false}`.

```tsx
<PopoverTrigger render={<InputGroupAddon />}>Pick date</PopoverTrigger>
```

**Correct:**

```tsx
<PopoverTrigger render={<InputGroupAddon />} nativeButton={false}>
  Pick date
</PopoverTrigger>
```

This repository's `Button` _is_ a Base UI part, so `<Button render={<Link />} nativeButton={false}>` adds `role="button"` to the link. For a link that looks like a button, style the router `<Link>` with `cn(buttonVariants({ variant: "outline" }))` instead; keep `cn`, or the variant's `border-transparent` beats the outline border.

```tsx
<Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
  {t("roadmaps.detail.back")}
</Link>
```

---

## Select

**items prop.** Base requires an `items` prop on the root.

**Incorrect:**

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
</Select>
```

**Correct:**

```tsx
const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
]

<Select items={items}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

**Placeholder.** Base uses a `{ value: null }` item in the items array.

**Content positioning.** Base uses `alignItemWithTrigger`.

```tsx
<SelectContent alignItemWithTrigger={false} side="bottom">
```

---

## Select — multiple selection and object values

Base supports `multiple`, render-function children on `SelectValue`, and object values with `itemToStringValue`.

**Correct (multiple selection):**

```tsx
<Select items={items} multiple defaultValue={[]}>
  <SelectTrigger>
    <SelectValue>
      {(value: string[]) =>
        value.length === 0 ? "Select fruits" : `${value.length} selected`
      }
    </SelectValue>
  </SelectTrigger>
  ...
</Select>
```

**Correct (object values):**

```tsx
<Select defaultValue={plans[0]} itemToStringValue={(plan) => plan.name}>
  <SelectTrigger>
    <SelectValue>{(value) => value.name}</SelectValue>
  </SelectTrigger>
  ...
</Select>
```

---

## ToggleGroup

Base uses a `multiple` boolean prop, and no `type`.

**Incorrect:**

```tsx
<ToggleGroup type="single" defaultValue="daily">
  <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
</ToggleGroup>
```

**Correct:**

```tsx
// Single (no prop needed), defaultValue is always an array.
<ToggleGroup defaultValue={["daily"]} spacing={2}>
  <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
  <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
</ToggleGroup>

// Multi-selection.
<ToggleGroup multiple>
  <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
  <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
</ToggleGroup>
```

**Controlled single value:** wrap and unwrap the array.

```tsx
const [value, setValue] = React.useState("normal")
<ToggleGroup value={[value]} onValueChange={(v) => setValue(v[0])}>
```

---

## Slider

Base accepts a plain number for a single thumb.

**Incorrect:**

```tsx
<Slider defaultValue={[50]} max={100} step={1} />
```

**Correct:**

```tsx
<Slider defaultValue={50} max={100} step={1} />
```

Range sliders use arrays. A controlled `onValueChange` may need a cast:

```tsx
const [value, setValue] = React.useState([0.3, 0.7])
<Slider value={value} onValueChange={(v) => setValue(v as number[])} />
```

---

## Accordion

Base uses no `type` prop, a `multiple` boolean, and `defaultValue` is always an array.

**Incorrect:**

```tsx
<Accordion type="single" collapsible defaultValue="item-1">
  <AccordionItem value="item-1">...</AccordionItem>
</Accordion>
```

**Correct:**

```tsx
<Accordion defaultValue={["item-1"]}>
  <AccordionItem value="item-1">...</AccordionItem>
</Accordion>

// Multi-select.
<Accordion multiple defaultValue={["item-1", "item-2"]}>
  <AccordionItem value="item-1">...</AccordionItem>
  <AccordionItem value="item-2">...</AccordionItem>
</Accordion>
```
