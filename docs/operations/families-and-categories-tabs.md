# Setting up the Families and Categories tabs

The owner's one-off step for ADR-013, done by hand in the shared spreadsheet. The
editor reads both tabs; the public site ignores them and keeps reading each roadmap's
own cells, which the editor keeps in step.

1. **Add a tab named `Families`**, anywhere but first (the public site reads the first
   tab as the roadmap index). Row 1 is the header; one family per row. The IDs below
   were generated in the `Item ID` format for this setup: copy them exactly.

   | ID         | Name                    | Name (cy) | Colour    |
   | ---------- | ----------------------- | --------- | --------- |
   | `fc29g5b9` | Single Record           |           | `#12a3c9` |
   | `vdkxj63m` | Medicines & Diagnostics |           | `#b9975b` |
   | `w3m6vqmh` | Core Platform & APIs    |           | `#325a8a` |
   | `v78c52nq` | National Data Resource  |           | `#325083` |

   Fill `Name (cy)` with each family's Welsh name where one exists; a blank shows the
   English name in Welsh, as today. The editor never edits it.

2. **Add a tab named `Categories`**, also not first, with the public site's six. `Name`
   must match the public site's spelling exactly, as the editor copies it to each
   roadmap's `Category` cell.

   | ID         | Name                       | Name (cy)                               |
   | ---------- | -------------------------- | --------------------------------------- |
   | `cbxzgnh4` | Public Health & Apps       | Iechyd y Cyhoedd ac Apiau               |
   | `khzpchkh` | GP & Community Services    | Meddygon Teulu a Gwasanaethau Cymunedol |
   | `w7vrv5kn` | Tests, Scans & Results     | Profion, Sganiau a Chanlyniadau         |
   | `jcfqpz55` | Urgent & Emergency Care    | Gofal Brys ac Argyfwng                  |
   | `jr5rdpmv` | Hospital & Specialist Care | Gofal Ysbyty ac Arbenigol               |
   | `k6dtpc4p` | National Systems & Data    | Systemau a Data Cenedlaethol            |

   Keep the rows in this order: it is the public site's order, and the editor offers
   categories in tab order.

3. **Leave the roadmap index as it is.** Each row is linked to its family and category
   by name, and gains `Family ID` and `Category ID` at its roadmap's next publish. A row
   whose family is spelt differently, or whose colour differs, shows as out of step in
   the editor, with a fix.

4. **Do not rename or delete either tab.** If one goes missing, the editor lists
   roadmaps as it did before families were managed, and says families (or categories)
   cannot be changed until the tab is back.
