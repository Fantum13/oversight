# Project: Oversight

**Oversight** is a browser-based **ERP** (Enterprise Resource Planning: one system that runs sales, inventory, production, warehouse, and shipping together) built around a **WMS** (Warehouse Management System: software that directs where stock lives and how it moves).

**Version:** 2.3 (concept-complete draft, pre-prototype)

**Product model:** Oversight is sold as software to **warehouse operators**: the company that installs and runs it at its own facility, on its own network. One installation serves one operator. Inside it, the operator may store and ship goods for several **owners** (companies whose goods are in the warehouse; the operator itself may be the only owner). Each owner's stock, orders, and data are kept strictly separate. Business policies such as shortage handling, reservation timeouts, and audit requirements are **operator-defined settings** chosen through dropdowns and data-entry fields, not fixed in code, and many can differ per owner. See [Section 12](#12-configuration-settings-operator-defined-options).

---

## Table of Contents

1. [Purpose and Goals](#1-purpose-and-goals)
2. [How to Read This Document](#2-how-to-read-this-document)
3. [Glossary](#3-glossary)
4. [User Roles](#4-user-roles)
5. [Core Records and Metadata](#5-core-records-and-metadata)
6. [Status Models](#6-status-models)
7. [Process A: Order-to-Ship](#7-process-a-order-to-ship)
8. [Process B: Raw Material Replenishment](#8-process-b-raw-material-replenishment)
9. [Process C: Production-to-Putaway](#9-process-c-production-to-putaway)
10. [Supporting Processes](#10-supporting-processes)
11. [System-Wide Rules](#11-system-wide-rules)
12. [Configuration Settings (Operator-Defined Options)](#12-configuration-settings-operator-defined-options)
13. [Prototype Readiness Checklist](#13-prototype-readiness-checklist)
14. [Change Log](#14-change-log)

---

## 1. Purpose and Goals

Oversight manages the full cycle of an order and the full cycle of the materials that make the product:

| Cycle | Covers |
|---|---|
| **Order-to-Ship** | Sales order building, payment, allocation, picking, audit, loading, shipping |
| **Raw Material Replenishment** | Reorder triggers, vendor purchase orders, receiving, material issue to production |
| **Production-to-Putaway** | Production, finished goods receipt, storage location assignment |

**Design goals**

1. **No overselling.** Stock promised to one order cannot be promised to another.
2. **Directed work.** Pickers and handlers are told what to move and where; they do not hunt for product.
3. **Accuracy at every handoff.** Each handoff between teams is a scan-verified checkpoint.
4. **Traceability.** Every unit can be traced from vendor lot, to production lot, to customer shipment.
5. **Automation with exceptions.** The system runs the normal path automatically and raises an alert, with a named responsible role, when it cannot.
6. **Owner separation.** One owner's stock, orders, and data can never be seen or touched by another owner.

### 1.1 Operating Model

| Party | Who they are | How they use Oversight |
|---|---|---|
| **Operator** | The company that installs and runs Oversight at its facility (for example a warehouse company) | Its staff do the daily work: sales entry, picking, auditing, loading, receiving, production. Its System Admin sets policy and creates owners. |
| **Owner** | A company whose goods are stored and shipped from the operator's warehouse. The operator can be its own owner (a manufacturer with its own warehouse). | Every item, lot, stock record, and order belongs to exactly one owner. Owner staff may get a view-only portal if the operator allows it. |
| **Customer account** (consignee) | A company an owner sells and ships to | Receives the owner's orders. Belongs to one owner. |
| **Vendor** | A company that supplies raw materials to an owner | Belongs to one owner. |

**Areas of the warehouse.** Each storage zone is assigned to exactly one owner, and locations are never shared between owners. Receiving, staging, dock doors, and quarantine are **shared operational areas** used by every owner; stock sitting there still belongs to its owner.

---

## 2. How to Read This Document

- **Jargon** is used on purpose, with a plain-language caption in parentheses the first time it appears. Section 3 collects them all.
- `field_names` in code style are proposed database/metadata field names (snake_case). `PK` = primary key (unique ID of a record). `FK` = foreign key (a link to another record).
- **Rule IDs** (for example `ALC-03`) mark every place the system must block, warn, or reroute. Each rule is a requirement for the prototype.
- **Block** = the system refuses the action. **Warn** = the system allows it after confirmation. **Reroute** = the system automatically takes an alternate path.
- **Rules describe the default behavior.** Where an operator-defined setting changes a rule, the setting is listed in the Section 12.5 catalog under "Governs". Settings are written as `cfg.setting_key` (for example `cfg.shortage_rule`). A few protections can never be changed (Section 12.7).
- **Owner** always means the company whose goods are stored (fields named `owner_id`). The role that handles an exception is called the **responsible role** (`responsible_role`).

---

## 3. Glossary

| Term | Plain meaning |
|---|---|
| **SKU** (Stock Keeping Unit) | A unique code for one sellable product and pack configuration |
| **Item Master** | The master list of every item with its fixed attributes (weight, dimensions, pack size) |
| **UOM** (Unit of Measure) | How quantity is counted: each, case, pallet |
| **Lot / Batch Number** | An ID for one production or receiving run, used for age tracking and recalls |
| **LPN** (License Plate Number) | The unique barcode on one pallet or container; scanning it identifies everything on it |
| **SSCC** (Serial Shipping Container Code) | A global-standard 18-digit pallet barcode; can serve as the LPN |
| **Location** | A specific storage address (zone, aisle, bay, level, slot) |
| **Slotting** | Deciding which products live in which locations |
| **Putaway** | Moving received or produced stock into its storage location |
| **Sales Order (SO)** | The customer's order recorded in Oversight |
| **Customer PO Number** | The purchase order number the customer issues to you (stored on the Sales Order) |
| **Purchase Order (PO)** | *Your* order to a vendor for raw materials. This term is reserved for vendor orders only. |
| **Net Terms** | Customer pays later (for example Net 30 = within 30 days) |
| **Credit Limit** | The maximum unpaid balance a customer may carry |
| **ATP** (Available-to-Promise) | Stock that can still be sold: on-hand minus allocated minus held |
| **Soft Reservation** | A temporary, time-limited claim on stock while a salesperson builds an order |
| **Hard Allocation** | A firm claim on specific lots and locations after the order is confirmed |
| **FIFO** (First-In-First-Out) | Use the oldest lot first |
| **FEFO** (First-Expired-First-Out) | Use the lot that expires soonest first |
| **Shelf Life** | How long product remains sellable; **Minimum Remaining Shelf Life** is what a customer will accept on arrival |
| **Pick Task** | One instruction telling a picker to take a quantity of an item from a location |
| **Pick Path / Pick Sequence** | The ordered route through the warehouse for a set of picks |
| **Pick Confirmation** | The scan that proves the picker took the right item from the right place |
| **Short Pick** | The location holds less than the system said it did |
| **Full-Pallet Pick** | Taking an entire pallet as one unit |
| **Case Pick / Broken-Pallet Pick** | Taking individual cartons from a partly used pallet |
| **Staging** | A holding area (or status) where a picked order waits to be checked and loaded |
| **Order Verification (Staging Audit)** | Independent scan-check that the staged order matches the Sales Order |
| **Short Ship** | Shipping less than ordered |
| **Shipment / Load Plan** | The record of what is going out on one truck: weight, cube, pallet count |
| **Cube** | Volume of freight |
| **Freight Tender / Carrier Booking** | Requesting a carrier to haul a shipment |
| **Dock Appointment** | A scheduled time and door for a truck to load |
| **Carrier Check-In** | Recording that a truck has arrived |
| **Seal Number** | The number on the tamper-evident seal locked on the trailer door |
| **BOL** (Bill of Lading) | The legal shipping document that lists what the carrier is hauling |
| **Ship Confirm** | The final approval that the loaded truck may leave; triggers inventory reduction and invoicing |
| **Inventory Relief** | Removing shipped quantities from on-hand stock |
| **BOM** (Bill of Materials) | The recipe: which raw materials, and how much, make one unit of product |
| **Work Order** | An instruction to the factory to produce a quantity of a product |
| **Reorder Point (ROP)** | Stock level at which replenishment is triggered |
| **Safety Stock** | Buffer quantity kept in case of delays or spikes |
| **Min/Max** | Reorder when stock falls to Min; order up to Max |
| **Inventory Position** | On-hand + on-order + in-production, minus allocated; the true basis for reorder decisions |
| **Purchase Requisition** | An internal request to buy, which becomes a PO |
| **Approved Vendor List (AVL)** | The vendors approved per material, ranked primary, secondary, tertiary |
| **ASN** (Advance Ship Notice) | A vendor's electronic notice of what is on the way |
| **Goods Receipt (GRN)** | The record that materials physically arrived and were counted |
| **CoA** (Certificate of Analysis) | The vendor's quality document for a lot |
| **QC** (Quality Control) | Inspection and release of material or product |
| **Quarantine** | A status that makes stock unusable until QC releases it |
| **Material Issue** | Moving raw materials from the warehouse to the production floor |
| **WIP** (Work-In-Progress) | Materials on the floor that are in production but not yet finished goods |
| **Kitting** | Gathering all materials for one work order together |
| **Finished Goods Receipt** | The record that produced product is complete and enters inventory |
| **Yield** | Actual quantity produced compared with expected |
| **Cycle Count** | A routine partial recount of inventory to verify accuracy |
| **Inventory Adjustment** | A recorded, reason-coded correction of stock quantity |
| **RMA** (Return Merchandise Authorization) | Approval for a customer to return goods |
| **Backorder** | The unfilled portion of an order, to be shipped later |
| **Segregation of Duties** | The same person may not perform two checks on the same work |
| **Atomic Transaction** | A group of database changes that all succeed or all fail together |
| **Row Locking** | Preventing two users from changing the same record at the same instant |
| **Audit Trail** | Permanent log of who changed what, and when |
| **Reason Code** | A required, selectable explanation for an override or correction |
| **Operator** | The company that installs and runs Oversight at its facility; the buyer of the software |
| **Owner** (client, depositor) | A company whose goods are stored and shipped from the operator's warehouse. May be the operator itself. Each owner's data is kept strictly separate. |
| **3PL** (Third-Party Logistics) | A warehouse that stores and ships goods on behalf of other companies |
| **Customer account** (consignee) | A company an owner sells and ships to; not the same as an owner |
| **Zone** | A named area of the warehouse; each storage zone is assigned to one owner |
| **Shared Operational Area** | A zone used by every owner (receiving, staging, dock doors, quarantine); not assigned to one owner |
| **Owner Portal** | A view-only login for an owner's own staff to see their own inventory (and orders, if permitted) |
| **Billing Event** | A recorded warehouse activity (receipt, putaway, pick, ship) that a future billing module can charge an owner for |
| **Configuration Setting** (`cfg.`) | An operator-chosen option that changes how a rule behaves (Section 12) |
| **Module** | A major feature area the operator can switch on or off (Section 12.6) |

---

## 4. User Roles

| Role | Primary responsibilities | Cannot do |
|---|---|---|
| **Sales Rep** | Build and confirm Sales Orders, look up ATP, take payment | Edit an order after picking starts; override credit holds |
| **Credit Manager** | Approve Net Terms, set credit limits, release credit holds | Pick or load |
| **Order Picker** | Execute assigned Pick Tasks | Pick tasks assigned to another picker; audit own picks |
| **Auditor** | Verify staged orders | Audit an order they picked |
| **Dock Loader** | Load trailers, record seal number | Ship Confirm |
| **Logistics Manager** | Book carriers, assign trucks, Ship Confirm | Alter audit results |
| **Material Handler** | Receive materials, Material Issue, Putaway | Approve vendor POs |
| **Production Supervisor** | Run Work Orders, Production Confirmation | Release QC holds |
| **QC Inspector** | Release or reject quarantined stock | Receive or move stock |
| **Purchasing Agent** | Manage vendors, approve POs, handle sourcing exceptions | Receive goods |
| **Warehouse Supervisor** | Approve overrides, reassign picks, approve adjustments | Approve their own adjustments |
| **System Admin** | Users, permissions, configuration, owners and zones | Transact on orders or inventory |
| **Owner Viewer** (owner portal user) | View the owner's own inventory (and orders, if the operator allows it) | Create or change anything; see another owner's data |

Every user has a unique `user_id` and one or more `role` assignments. Every scan and status change records the `user_id`.

The roles above are the **defaults** that ship with Oversight. Which roles may perform each override or approval (credit override, short-ship approval, pick reassignment, Ship Confirm) is set by the operator through role-picker settings (Section 12.5). Whether the operator may also create custom roles is a software-vendor decision (Section 12.8).

**Owner access.** Every user is either **operator staff** or an **owner portal user**. Operator staff can be allowed to work with all owners or with a listed few (`owner_scope`). Owner portal users see only the owners listed on their account, are view-only, and exist only where the operator has turned the portal on for that owner. Operator staff work in one owner's context at a time, chosen with the working-owner selector (`OWN-07`).

---

## 5. Core Records and Metadata

These are the master and transaction records the whole system depends on. Define them first; every process below reads or writes them.

**Owner note:** every owner-specific record in this section (items, customer accounts, vendors, lots, inventory, orders, allocations, tasks, shipments, work orders, purchase orders, and so on) also carries an `owner_id`: which company's goods or business it belongs to. Uniqueness rules apply *within* an owner (two owners may both have SKU `1001`). The building itself (operator, site, zone, equipment type, dock door) is not owner-specific, except that each storage zone is assigned to one owner. Owner separation is described in Section 10.6.

### 5.0 Operator, Site, Owner, Zone, and User Access

| Record | Key fields |
|---|---|
| `operator` (one row per installation) | `operator_id`, `name`, `timezone`, `default_currency` |
| `site` | `site_id`, `name`, `address` |
| `owner` | `owner_id`, `owner_code`, `name`, `status` (`ACTIVE`, `SUSPENDED`, `MOVING_OUT`, `INACTIVE`), `agreement_ref` |
| `zone` | `zone_id`, `site_id`, `zone_code`, `zone_use` (`STORAGE`, `RECEIVING`, `STAGING`, `DOCK`, `QUARANTINE`, `WIP`, `OVERFLOW`), `owner_id` (blank only when `is_shared = Yes`), `is_shared` (Yes/No) |
| `user` | `user_id`, `name`, `user_type` (`OPERATOR_STAFF` or `OWNER_PORTAL`), `owner_scope` (`ALL` or `LISTED`), `status` |
| `user_owner_access` | `user_id`, `owner_id`: the owners a user with `owner_scope = LISTED`, or any portal user, may see |
| `role_permission` | `role`, `permission`: stored as data so roles can change without code changes |

**Rule `ZON-01` (Block):** a `STORAGE` zone must have an `owner_id` and `is_shared = No`; a shared zone must have no `owner_id`. Ownership is stored on the zone only; locations inherit it.

### 5.1 Item Master (`item`)

| Field | Description |
|---|---|
| `item_id` (PK) | Unique internal ID |
| `owner_id` (FK) | The owner this item belongs to |
| `sku` | Product code, unique **within the owner** |
| `description` | Product name |
| `item_type` | `FINISHED_GOOD` or `RAW_MATERIAL` |
| `status` | `ACTIVE`, `DISCONTINUED`, `BLOCKED` |
| `base_uom` | Smallest counted unit (each, lb, etc.) |
| `units_per_case` | Base units in a case |
| `cases_per_pallet` | Cases on a full pallet |
| `unit_weight`, `case_weight`, `pallet_weight` | Weight of each level (with unit, such as lb) |
| `case_length`, `case_width`, `case_height` | Dimensions |
| `min_order_qty`, `order_multiple` | Sales rules (case-only, etc.) |
| `is_lot_controlled` | Yes/No: must lot number be tracked? |
| `has_expiration` | Yes/No |
| `shelf_life_days` | Total shelf life |
| `rotation_rule` | `FIFO` or `FEFO` |
| `storage_class` | `AMBIENT`, `COLD`, `FROZEN`, etc. |
| `is_hazmat`, `hazmat_class` | Hazardous material flags |
| `reorder_point`, `safety_stock`, `max_level` | Raw materials: replenishment settings |
| `lead_time_days` | Raw materials: typical vendor delivery time |
| `default_location_zone` | Preferred slotting zone |

**Rule `ITM-01` (Block):** An item with missing weight, dimensions, or units-per-pallet cannot be sold or produced. This prevents zero-weight shipments.

### 5.2 Customer (`customer`)

| Field | Description |
|---|---|
| `customer_id` (PK) | Unique ID |
| `owner_id` (FK) | The owner whose buyer this is (a consignee) |
| `name`, `bill_to_address`, `status` | Basics; status is `ACTIVE`, `HOLD`, `INACTIVE` |
| `payment_type` | `NET_TERMS` or `PREPAID_CARD` |
| `terms_code` | For example `NET30` |
| `credit_limit` | Maximum open balance |
| `open_balance` | Current unpaid total |
| `past_due_balance` | Overdue portion |
| `credit_hold` | Yes/No |
| `min_remaining_shelf_life_days` | Acceptable shelf life on arrival |
| `allow_lot_mixing` | May one order line contain more than one lot? |
| `tax_exempt`, `tax_id` | Tax handling |

Related: `ship_to_address` (multiple per customer): `ship_to_id`, `customer_id`, `address`, `dock_hours`, `delivery_instructions`.

### 5.3 Location (`location`)

| Field | Description |
|---|---|
| `location_id` (PK) | Unique ID (printable and barcoded) |
| `zone_id` (FK), `aisle`, `bay`, `level`, `slot` | Zone and physical address parts. Ownership comes from the zone and is never stored on the location. |
| `location_type` | `PALLET_RACK`, `FLOOR`, `CASE_PICK`, `STAGING`, `DOCK_DOOR`, `WIP`, `QUARANTINE` |
| `pick_sequence_number` | Order of this location along the pick path |
| `max_weight`, `max_height`, `max_pallets` | Capacity limits |
| `allowed_storage_class` | Compatibility with items |
| `status` | `OPEN`, `BLOCKED`, `COUNT_IN_PROGRESS`, `DAMAGED` |
| `check_digit` | Short code the user scans/enters to prove they are at the right spot |

### 5.4 Lot (`lot`)

| Field | Description |
|---|---|
| `lot_id` (PK) | Unique ID |
| `owner_id` (FK) | The owner this lot belongs to |
| `lot_number` | Printed lot code; **unique per item** |
| `item_id` (FK) | Item |
| `source_type` | `PRODUCTION` or `VENDOR_RECEIPT` |
| `source_ref_id` | Work Order or Goods Receipt that created it |
| `production_date`, `received_date`, `expiration_date` | Dates |
| `qc_status` | `PENDING`, `RELEASED`, `REJECTED` |
| `vendor_lot_number` | Raw materials: the vendor's own lot code |

### 5.5 Inventory Record (`inventory`)

One row per LPN (pallet or container) per location. This is the single source of truth for what is where.

| Field | Description |
|---|---|
| `inventory_id` (PK) | Unique ID |
| `owner_id` (FK) | Owner of this stock. Must equal the owner of the location's zone unless the zone is shared (`OWN-03`). |
| `lpn` | Pallet barcode (unique) |
| `item_id`, `lot_id` (FK) | What and which lot |
| `location_id` (FK) | Current location |
| `qty_on_hand` | Quantity in base UOM |
| `qty_allocated` | Quantity locked to orders |
| `status` | See [6.2](#62-inventory-status-inventorystatus) |
| `pending_putaway` | Yes/No |
| `last_counted_at` | Last cycle count date |
| `updated_at`, `updated_by` | Audit fields |

**Available-to-Promise calculation:**
`atp_qty = Σ (qty_on_hand − qty_allocated)` across inventory rows where `status = AVAILABLE`, `lot.qc_status = RELEASED`, lot not expired, location `status = OPEN`, `pending_putaway = No`; minus active soft reservations.

### 5.6 Sales Order (`sales_order`) and Lines (`sales_order_line`)

| Field | Description |
|---|---|
| `so_id` (PK) | Unique ID |
| `owner_id` (FK) | The owner this order belongs to |
| `so_number` | Human-readable order number |
| `customer_id`, `ship_to_id` (FK) | Customer and destination |
| `customer_po_number` | The customer's PO number (required for Net Terms) |
| `status` | See [6.1](#61-order-status-sales_orderstatus) |
| `payment_type`, `payment_status` | `UNPAID`, `AUTHORIZED`, `CAPTURED`, `ON_ACCOUNT`, `FAILED` |
| `order_total`, `tax_total` | Money |
| `requested_ship_date` | Customer's date |
| `confirmed_at`, `confirmed_by` | When and who committed it |
| `hold_reason` | If on hold |
| `config_snapshot` | Copy of the customer settings in force when the order was confirmed (`CFG-04`) |
| `created_by` | Sales rep |

Line fields: `line_id`, `so_id`, `item_id`, `qty_ordered`, `uom`, `unit_price`, `line_total`, `qty_allocated`, `qty_picked`, `qty_audited`, `qty_loaded`, `qty_shipped`, `qty_backordered`, `line_status`.

### 5.7 Soft Reservation (`soft_reservation`)

`reservation_id`, `so_id`, `item_id`, `qty`, `created_by`, `created_at`, `expires_at`. Expires automatically after `cfg.soft_reservation_timeout_minutes` (operator-defined, overridable per owner; Oversight default 30).

### 5.8 Allocation (`allocation`)

One row per quantity reserved from a specific inventory row for a specific order line.

`allocation_id`, `so_id`, `line_id`, `inventory_id`, `lot_id`, `location_id`, `qty_allocated`, `qty_picked`, `status` (`ALLOCATED`, `PICKED`, `RELEASED`, `SHORT`), `allocated_at`.

### 5.9 Pick Task (`pick_task`)

`task_id`, `so_id`, `allocation_id`, `assigned_picker_id`, `pick_sequence`, `from_location_id`, `item_id`, `lot_id`, `lpn`, `qty_to_pick`, `qty_picked`, `pick_type` (`FULL_PALLET` or `CASE`), `task_key` (the lock described in Stage 5), `status` (`OPEN`, `IN_PROGRESS`, `COMPLETE`, `SHORT`, `CANCELLED`), `picked_at`.

### 5.10 Shipment (`shipment`) and Shipment Pallets

| Field | Description |
|---|---|
| `shipment_id` (PK) | Unique ID |
| `owner_id` (FK) | The owner whose order is on this shipment (one owner per shipment) |
| `so_id` (FK) | Order (one shipment may later cover multiple orders) |
| `planned_weight`, `planned_cube`, `planned_pallet_count`, `planned_carton_count` | Calculated at release |
| `actual_weight`, `actual_pallet_count` | Recorded at load |
| `carrier_id`, `carrier_service` | Carrier |
| `dock_appointment_start`, `dock_door` | Schedule |
| `truck_number` / `trailer_number` | Assigned vehicle |
| `seal_number` | Recorded at load |
| `bol_number` | Generated at ship confirm |
| `status` | `PLANNED`, `BOOKED`, `CHECKED_IN`, `LOADING`, `LOADED`, `SHIPPED` |
| `checked_in_at`, `loaded_at`, `departed_at` | Timestamps |

Related: `shipment_pallet` (`shipment_id`, `lpn`, `scanned_at`, `scanned_by`).

### 5.11 Vendor and Purchasing

| Record | Key fields |
|---|---|
| `vendor` | `vendor_id`, `owner_id`, `name`, `status`, `payment_terms`, `lead_time_days` |
| `approved_vendor` (AVL) | `item_id`, `vendor_id`, `priority` (1 = primary), `min_order_qty`, `unit_cost`, `vendor_item_code` |
| `purchase_requisition` | `req_id`, `item_id`, `qty`, `trigger_reason`, `status`, `created_at` |
| `purchase_order` | `po_id`, `po_number`, `vendor_id`, `status`, `expected_date`, `total_cost`, `approved_by` |
| `purchase_order_line` | `po_line_id`, `po_id`, `item_id`, `qty_ordered`, `qty_received`, `unit_cost` |
| `goods_receipt` | `grn_id`, `po_id`, `received_by`, `received_at`, `asn_ref` |
| `goods_receipt_line` | `item_id`, `qty_received`, `lot_number`, `vendor_lot_number`, `expiration_date`, `lpn`, `qc_status` |

### 5.12 Production

| Record | Key fields |
|---|---|
| `bom` | `bom_id`, `finished_item_id`, `version`, `status`, `yield_basis_qty` |
| `bom_line` | `bom_id`, `raw_item_id`, `qty_per`, `scrap_pct` |
| `work_order` | `wo_id`, `wo_number`, `finished_item_id`, `bom_id`, `qty_planned`, `qty_produced`, `status`, `trigger_type` (`REORDER` or `MANUAL`), `released_at`, `due_date` |
| `material_allocation` | `wo_id`, `inventory_id`, `lot_id`, `qty`, `status` |
| `material_issue` | `issue_id`, `wo_id`, `lpn`, `from_location_id`, `to_wip_location_id`, `qty`, `issued_by`, `issued_at` |
| `production_confirmation` | `wo_id`, `qty_produced`, `qty_scrap`, `lot_number`, `completed_by`, `completed_at` |
| `putaway_task` | `task_id`, `lpn`, `item_id`, `qty`, `from_location_id`, `to_location_id`, `status` |

### 5.13 Supporting Records

| Record | Key fields |
|---|---|
| `audit_log` | `log_id`, `entity_type`, `entity_id`, `action`, `old_value`, `new_value`, `reason_code`, `user_id`, `timestamp` |
| `exception` | `exception_id`, `exception_type`, `severity`, `entity_ref`, `responsible_role`, `status`, `created_at`, `resolved_at`, `resolution_note` |
| `inventory_adjustment` | `adj_id`, `inventory_id`, `qty_before`, `qty_after`, `reason_code`, `requested_by`, `approved_by` |
| `cycle_count` | `count_id`, `location_id`, `expected_qty`, `counted_qty`, `variance`, `counted_by`, `status` |
| `invoice` | `invoice_id`, `so_id`, `shipment_id`, `amount`, `due_date`, `status` |
| `rma` | `rma_id`, `so_id`, `reason_code`, `status`, `disposition` (`RESTOCK`, `SCRAP`, `RETURN_TO_VENDOR`) |
| `billing_event` | `event_id`, `owner_id`, `event_type` (`RECEIPT`, `PUTAWAY`, `PICK`, `SHIP`, `STORAGE_SNAPSHOT`), `entity_ref`, `qty`, `occurred_at`. Recorded from v1; billed by a future module (Section 10.7). |

---

## 6. Status Models

Every status change is a **transition**. Only the transitions listed here are legal. Anything else is blocked and logged.

### 6.1 Order Status (`sales_order.status`)

| Status | Meaning | Allowed next status |
|---|---|---|
| `DRAFT` | Being built (soft reservations active) | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Payment/credit cleared; stock hard-allocated | `RELEASED`, `ON_HOLD`, `CANCELLED` |
| `RELEASED` | Sent to fulfillment (this is the README's "Pending") | `PICKING`, `ON_HOLD`, `CANCELLED` |
| `PICKING` | At least one Pick Task started | `PICKED`, `ON_HOLD` |
| `PICKED` | All Pick Tasks complete | `IN_AUDIT` |
| `IN_AUDIT` | Verification in progress | `AUDITED`, `PICKING` (reopen to correct) |
| `AUDITED` | Verified and signed off | `STAGED` |
| `STAGED` | Waiting for truck/dock | `LOADING`, `ON_HOLD` |
| `LOADING` | Dock loader scanning onto truck | `LOADED` |
| `LOADED` | Loader signed off | `SHIPPED` |
| `SHIPPED` | Ship Confirm complete | `CLOSED` |
| `CLOSED` | Invoiced and complete | none |
| `ON_HOLD` | Frozen by credit, supervisor, or logistics | Returns to prior status when released |
| `CANCELLED` | Stopped; allocations released | none |

### 6.2 Inventory Status (`inventory.status`)

`AVAILABLE`, `ALLOCATED`, `PICKED`, `STAGED`, `LOADED`, `SHIPPED`, `HOLD`, `QUARANTINE`, `DAMAGED`, `IN_TRANSIT`, `PENDING_PUTAWAY`.

Only `AVAILABLE` stock counts toward ATP. Stock with `PENDING_PUTAWAY` becomes `AVAILABLE` only after the **putaway scan** confirms its location.

### 6.3 Work Order Status (`work_order.status`)

`PLANNED` → `MATERIALS_ALLOCATED` → `RELEASED` → `IN_PRODUCTION` → `COMPLETE` → `CLOSED`. Side states: `WAITING_MATERIALS`, `ON_HOLD`, `CANCELLED`.

### 6.4 Purchase Order Status (`purchase_order.status`)

`DRAFT` → `PENDING_APPROVAL` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED` → `CLOSED`. Side state: `CANCELLED`.

---

## 7. Process A: Order-to-Ship

### Stage 1. Order Building and Availability Lookup

**What happens:** A **Sales Rep** works with the customer to build a **Sales Order**, checking **ATP** (Available-to-Promise: what can still be sold) for each item. When a line is added, the system places a **Soft Reservation** (a temporary hold) so no other rep can promise the same stock.

**Writes:** `sales_order` (`DRAFT`), `sales_order_line`, `soft_reservation`.

| Rule | Type | Check |
|---|---|---|
| `SO-01` | Block | The item is `ACTIVE` and passes `ITM-01`. |
| `SO-02` | Block | `qty_ordered` meets `min_order_qty` and `order_multiple` (for example case-only items). |
| `SO-03` | Block | `qty_ordered` ≤ current `atp_qty`. Show the ATP number to the rep. |
| `SO-04` | Reroute | Soft reservations expire at `expires_at`; the stock returns to ATP automatically. Warn the rep when an expiry is near. |
| `SO-05` | Block | Customer `status` is `ACTIVE`; ship-to address is valid. |
| `SO-06` | Block | A price exists and is valid on the order date, unless `cfg.require_order_pricing` is Off for this owner. |
| `SO-07` | Warn | A customer's `min_remaining_shelf_life_days` cannot be met by available lots (ATP shows only qualifying lots for that customer). |

### Stage 2. Payment and Credit Validation

**What happens:** The rep chooses a payment path.

- **Net Terms (bill on account):** the customer's **Customer PO Number** is recorded and the account is validated against its **Credit Limit**.
- **Card payment:** the card is **authorized** (funds reserved) now and **captured** (funds actually collected) at Ship Confirm, or captured immediately, per configuration.
- **Owner-managed:** the owner bills its own customers outside Oversight (typical for a 3PL owner). No payment or credit check is made, and the order records payment type `OWNER_MANAGED`.

**Writes:** `sales_order.customer_po_number`, `payment_type`, `payment_status`.

| Rule | Type | Check |
|---|---|---|
| `PAY-01` | Block | Net Terms requires `customer_po_number`; it must be unique per customer (duplicate = Block unless a Sales Manager overrides with a reason code). |
| `PAY-02` | Block | Customer is approved for Net Terms (`terms_code` present). |
| `PAY-03` | Block | `open_balance + order_total` ≤ `credit_limit`. |
| `PAY-04` | Block | `past_due_balance` = 0, or Credit Manager overrides. Block if `credit_hold = Yes`. |
| `PAY-05` | Block | A failed card authorization sets `payment_status = FAILED` and blocks confirmation. |
| `PAY-06` | Reroute | If the order is cancelled after authorization, the system voids the authorization automatically. If already captured, it creates a refund task. |

### Stage 3. Order Confirmation and Hard Allocation

**What happens:** The rep **Confirms** the order (**Order Commit**). In one **atomic transaction** (all steps succeed or none do), the system re-checks availability, converts soft reservations into **Hard Allocations** (firm claims on specific lots and locations), and moves the order to `CONFIRMED`.

**Writes:** `allocation`, `inventory.qty_allocated`, `sales_order.status`, `confirmed_at`, `confirmed_by`.

| Rule | Type | Check |
|---|---|---|
| `CNF-01` | Block | The order has at least one line with `qty_ordered` > 0. |
| `CNF-02` | Block | Availability is re-verified inside the transaction using **row locking**, so two reps cannot confirm against the same stock. |
| `CNF-03` | Block or Reroute | **Shortage rule** (`cfg.shortage_rule`, set by the operator, overridable per owner and per customer account): `REJECT` the whole order, `PARTIAL_BACKORDER` (allocate what exists; the rest becomes `qty_backordered`), or `SPLIT_SHIPMENT`. |
| `CNF-04` | Block | Payment and credit checks (`PAY-01` to `PAY-05`) all pass at confirm time, not only at entry. |
| `CNF-05` | Block | Edits after `RELEASED` are limited. After `PICKING` begins, line changes are **locked**; a change requires Supervisor-approved cancel and rebuild. |
| `CNF-06` | Reroute | **Cancel** releases every allocation, resets `qty_allocated`, and cancels open Pick Tasks. |

### Stage 4. Release to Order Fulfillment

**What happens:** The confirmed order populates in **Order Fulfillment** with status `RELEASED` (the README's "Pending"). The system automatically builds the **picking plan** and the **Logistics profile** at the same moment.

#### 4a. Picking plan (batch selection and pick path)

The system chooses stock using the item's `rotation_rule` (**FIFO** by `lot.production_date`/`received_date`, or **FEFO** by `lot.expiration_date`) and assigns the nearest locations by `location.pick_sequence_number` so the **Pick Path** (route) is efficient and not chaotic.

| Rule | Type | Check |
|---|---|---|
| `ALC-01` | Block | Exclude lots with `qc_status ≠ RELEASED`, inventory in `HOLD`/`QUARANTINE`/`DAMAGED`, expired lots, and any lot that cannot meet `min_remaining_shelf_life_days`. |
| `ALC-02` | Block | Exclude locations with `status ≠ OPEN` (blocked, under count, damaged). |
| `ALC-03` | Reroute | If `allow_lot_mixing = No`, a single order line must be satisfied from one lot; otherwise Warn that a split is needed or Block per customer rule. |
| `ALC-04` | Reroute | Prefer whole-pallet picks where the quantity matches a full pallet; otherwise use the oldest partial pallet first to consolidate. |
| `ALC-05` | Reroute | If allocation cannot be completed after release (stock became unavailable, for example by a quality hold), the affected line is re-allocated automatically; if impossible, raise an `exception` to the Warehouse Supervisor. |

#### 4b. Logistics profile (shipment plan)

Weights, dimensions, and pallet counts are calculated from the Item Master and attached to the `shipment` so Logistics can book transportation.

**Writes:** `shipment.planned_weight`, `planned_cube`, `planned_pallet_count`, `planned_carton_count`.

| Rule | Type | Check |
|---|---|---|
| `LOG-01` | Block | Plan generation fails (with the missing field named) if item weight, dimensions, or units-per-pallet is missing. No zeros. |
| `LOG-02` | Block | `planned_weight` and `planned_pallet_count` ≤ maximum capacity for the booked equipment type and legal road limits. |
| `LOG-03` | Block | Hazmat and `storage_class` (for example cold) must be compatible with the carrier and trailer type. |

### Stage 5. Pick Task Assignment and Picking

**What happens:** Each **Pick Task** is assigned to a specific **Picker ID**. The `task_key` ties the task to the order, and only the assigned picker can scan that product out of its location. This removes the need for logistics staff to hunt for product and guarantees allocated stock cannot be taken by someone else.

**Scan sequence per task:** scan location (`check_digit`) → scan LPN or carton barcode → enter or confirm quantity (**Pick Confirmation**).

**Writes:** `pick_task.qty_picked`, `status`, `picked_at`; `allocation.qty_picked`; `inventory.status` (`PICKED`); `sales_order.status` (`PICKING` then `PICKED`).

| Rule | Type | Check |
|---|---|---|
| `PCK-01` | Block | Only the `assigned_picker_id` can confirm the task. |
| `PCK-02` | Block | Reject a scan of the wrong location, item, lot, or LPN. |
| `PCK-03` | Block | Reject an over-pick (`qty_picked` > `qty_to_pick`). |
| `PCK-04` | Reroute | **Short Pick:** the picker reports that the location holds less than expected. The system records the actual quantity, flags the location for **Cycle Count** (`location.status = COUNT_IN_PROGRESS`), creates an `inventory_adjustment` for approval, and automatically **re-allocates** the shortfall from the next lot or location, so there is never a silent oversell. If no stock remains, apply `CNF-03`. |
| `PCK-05` | Reroute | If a picker is absent, a Warehouse Supervisor may **reassign** tasks; the reassignment is logged with a reason code. |
| `PCK-06` | Block | The order does not advance to `PICKED` until every Pick Task is `COMPLETE` or formally resolved by `PCK-04`. |

### Stage 6. Carrier Booking and Truck Assignment

**What happens:** Logistics uses the shipment plan to arrange a carrier (**Freight Tender**) and schedule a **Dock Appointment**. When the truck arrives, it is checked in (**Carrier Check-In**) and its `truck_number` is attached to the order.

**Writes:** `shipment.carrier_id`, `dock_appointment_start`, `dock_door`, `truck_number`, `trailer_number`, `checked_in_at`, `status`.

| Rule | Type | Check |
|---|---|---|
| `TRK-01` | Block | The carrier must be on the approved carrier list with valid insurance on file. |
| `TRK-02` | Block | `truck_number` and `trailer_number` match the required format. |
| `TRK-03` | Block | A truck/trailer cannot be assigned to two active shipments, or a dock door to two trucks, at the same time. |
| `TRK-04` | Warn | The truck arrives before the order is `STAGED`: place it in a waiting queue and notify Logistics. |
| `TRK-05` | Block | A truck cannot be checked in against an order that is `ON_HOLD` or `CANCELLED`. |
| `TRK-06` | Warn | Equipment capacity does not match the plan (`LOG-02` re-checked at check-in). |

### Stage 7. Order Verification (Staging Audit)

**What happens:** The picked order passes to **Auditing**. The Auditor scans each full-pallet **LPN** label and each carton barcode on partial pallets, comparing the staged goods against the Sales Order. If anything is missing, the order cannot advance until the missing item is added.

**Writes:** `sales_order_line.qty_audited`, `sales_order.status` (`IN_AUDIT` then `AUDITED`), `audit_log`.

| Rule | Type | Check |
|---|---|---|
| `AUD-01` | Block | The Auditor must not be the picker of any task on this order (**segregation of duties**). |
| `AUD-02` | Block | Reject LPNs/cartons that belong to another order, the wrong lot, damaged or expired product, or over-quantity. |
| `AUD-03` | Block | **Completeness gate:** `qty_audited` must equal `qty_picked` for every line before sign-off. |
| `AUD-04` | Reroute | **Short-ship override:** if an item cannot be found or recovered, a Warehouse Supervisor plus Sales (with customer approval) may authorize a short ship with a reason code. The shortfall becomes a backorder or a credit. |
| `AUD-05` | Block | Audit sign-off is **immutable**. A correction requires a **reopen** (status back to `PICKING`) with a reason code, and the reopen is logged. |

### Stage 8. Dock Loading

**What happens:** The order passes to the dock team. The **Dock Loader** enters the `truck_number`, and Oversight matches it to the `truck_number` previously assigned to the order. Once it matches, loading begins. Each pallet or carton is scanned onto the truck. The loader records the **Seal Number** and signs off.

**Writes:** `shipment_pallet`, `shipment.actual_weight`, `actual_pallet_count`, `seal_number`, `loaded_at`, `status`; `inventory.status` (`LOADED`); `sales_order.status` (`LOADING` then `LOADED`).

| Rule | Type | Check |
|---|---|---|
| `DCK-01` | Block | A truck number that does not match the assigned shipment blocks loading. |
| `DCK-02` | Block | Only orders with status `STAGED` can be loaded. |
| `DCK-03` | Block | Every LPN/carton must be **scanned onto the truck**; a button press alone cannot sign off. |
| `DCK-04` | Block | Reject scans of anything not belonging to this order. |
| `DCK-05` | Block | `seal_number` is required before sign-off. |
| `DCK-06` | Warn | Scanned count differs from `planned_pallet_count`: require a reason code. |

### Stage 9. Ship Confirm

**What happens:** The loaded order passes to **Logistics Management**, who give the final approval for the carrier to depart (**Ship Confirm**). The system generates the **BOL** (Bill of Lading, the shipping document), performs **Inventory Relief** (removes the shipped stock from on-hand), and triggers invoicing or card capture.

**Writes:** `shipment.bol_number`, `departed_at`, `status = SHIPPED`; `inventory.qty_on_hand` reduced; `allocation.status`; `sales_order_line.qty_shipped`; `invoice`.

| Rule | Type | Check |
|---|---|---|
| `SHP-01` | Block | Requires: audit complete, load complete, no credit or payment hold. |
| `SHP-02` | Block | Only Logistics Management can Ship Confirm (the Dock Loader cannot). |
| `SHP-03` | Reroute | Backordered quantities remain open as a new fulfillment cycle. |
| `SHP-04` | Reroute | Inventory Relief, invoicing, and card capture occur in one atomic transaction; if any step fails, the whole Ship Confirm rolls back and raises an exception. |

**This completes the cycle of one order**, with inventory accuracy and shipping accuracy enforced at every step.

---

## 8. Process B: Raw Material Replenishment

### Stage B1. Reorder Trigger

**What happens:** When **Inventory Position** (on-hand + on-order + in-production, minus allocated) falls to an item's **Reorder Point**, the system triggers production of new finished product and creates a **Work Order** from the product's **BOM**. Triggering on position, not only on-hand, prevents duplicate Work Orders for the same need.

**Writes:** `work_order` (`PLANNED`), `trigger_type = REORDER`.

| Rule | Type | Check |
|---|---|---|
| `RPL-01` | Block | No second Work Order is created while an open one already covers the shortfall (uses Inventory Position). |
| `RPL-02` | Block | The finished item must have an `ACTIVE` BOM; otherwise raise an exception. |
| `RPL-03` | Reroute | The trigger quantity is rounded to the item's production lot size. |

### Stage B2. Material Allocation (Kitting)

**What happens:** The system assigns raw materials to the Work Order, choosing the oldest **lot** or the earliest expiration (FIFO/FEFO) and generating **Material Issue** tasks for the **Material Handlers**.

**Writes:** `material_allocation`, `work_order.status` (`MATERIALS_ALLOCATED`).

| Rule | Type | Check |
|---|---|---|
| `MAT-01` | Block | A Work Order cannot be released if BOM components are insufficient. It moves to `WAITING_MATERIALS` and raises an exception (partial release is governed by `cfg.partial_work_order_release`; see Section 12.5). |
| `MAT-02` | Block | Exclude expired, quarantined, and held materials. |
| `MAT-03` | Block | One lot quantity cannot be allocated to two Work Orders. |
| `MAT-04` | Block | Component quantity = `qty_planned × qty_per`, adjusted for `scrap_pct`. |

### Stage B3. Material Issue to Production

**What happens:** Material Handlers move the assigned materials from storage to the production floor **WIP location**. This removes them from raw material inventory. At the same time the Work Order is queued for the factory floor.

**Writes:** `material_issue`; `inventory` (quantity moved to the WIP location, status updated); `work_order.status` (`RELEASED`).

| Rule | Type | Check |
|---|---|---|
| `ISS-01` | Block | Scan-verify the LPN, lot, and quantity against the allocation. |
| `ISS-02` | Block | Reject over-issue. An additional issue requires a Production Supervisor reason code. |
| `ISS-03` | Reroute | Unconsumed material is returned via a **return-to-stock** transaction, with its lot preserved. |

### Stage B4. Automatic Vendor Replenishment

**What happens:** Issuing materials reduces raw material stock below its Reorder Point (or **Min/Max** thresholds), which automatically creates a **Purchase Requisition**, then a **Purchase Order** to the primary vendor on the **Approved Vendor List**. If the primary vendor is out of stock, the system tries the secondary vendor, then tertiary.

**Writes:** `purchase_requisition`, `purchase_order`, `purchase_order_line`.

| Rule | Type | Check |
|---|---|---|
| `PUR-01` | Block | Open PO quantities are counted in Inventory Position before ordering (no duplicate POs). |
| `PUR-02` | Reroute | Order quantity respects vendor `min_order_qty` and lead time (`lead_time_days`). |
| `PUR-03` | Warn | POs above a spend threshold route to `PENDING_APPROVAL` (the Purchasing Agent). |
| `PUR-04` | Reroute | The primary vendor is out of stock: automatically fall to the next AVL priority. |
| `PUR-05` | Block | **All sources out of stock:** create a high-severity `exception` assigned to the Purchasing Agent, with escalation after a set time. Manual intervention is required to locate material. |
| `PUR-06` | Reroute | A manual override to create or alter a PO is always available (with an audit log entry). |

### Stage B5. Receiving

**What happens:** When a vendor shipment arrives, Material Handlers perform a **Goods Receipt**, matching it to the PO (and the **ASN**, if provided), capturing lot and expiration details. The receipt begins the raw material cycle again.

**Writes:** `goods_receipt`, `goods_receipt_line`, `lot`, `inventory` (`QUARANTINE` or `PENDING_PUTAWAY`), `purchase_order_line.qty_received`.

| Rule | Type | Check |
|---|---|---|
| `RCV-01` | Block | Receive only against an open PO from a known vendor for a known item. |
| `RCV-02` | Warn / Block | Over- or under-receipt beyond the tolerance percentage requires Purchasing approval. |
| `RCV-03` | Block | Lot number and expiration date are required where `is_lot_controlled` / `has_expiration` is Yes. |
| `RCV-04` | Reroute | Material requiring QC or a **CoA** goes to `QUARANTINE` until a QC Inspector releases it. |
| `RCV-05` | Block | Expired-on-arrival material is rejected, and a return-to-vendor task is created. |
| `RCV-06` | Reroute | Receipt updates the PO status (`PARTIALLY_RECEIVED` or `RECEIVED`). |

---

## 9. Process C: Production-to-Putaway

### Stage C1. Production and Production Confirmation

**What happens:** The factory runs the Work Order. When complete, the Production Supervisor records a **Production Confirmation**: quantity produced, scrap, and the new **Lot Number**. The system generates the metadata for the produced product (the **Finished Goods Receipt**) and queues it for movement to the warehouse.

**Writes:** `production_confirmation`, `lot`, `inventory` (`PENDING_PUTAWAY`; `qc_status = PENDING` where QC is required), `work_order.status` (`COMPLETE`), `putaway_task`.

| Rule | Type | Check |
|---|---|---|
| `PRD-01` | Block | A lot number is mandatory and unique per item. |
| `PRD-02` | Warn | **Yield** outside the tolerance range of expected quantity requires a reason code. |
| `PRD-03` | Reroute | If QC is required, finished lots remain `PENDING` and cannot be put away to saleable locations until released. |
| `PRD-04` | Block | Production consumes materials per BOM; a variance beyond tolerance requires review. |

### Stage C2. Putaway

**What happens:** Oversight assigns storage locations (**Directed Putaway**) to keep like product together and in efficient locations along proper pick paths for future orders. The handler scans the LPN and then the location **check digit** to confirm.

**Writes:** `putaway_task` (`COMPLETE`), `inventory.location_id`, `status = AVAILABLE`, `pending_putaway = No`.

| Rule | Type | Check |
|---|---|---|
| `PUT-01` | Block | The destination location must be `OPEN`, pass capacity checks (`max_weight`, `max_height`, `max_pallets`), and lie in a zone assigned to the inventory's owner (or a shared zone), per `OWN-03`. |
| `PUT-02` | Block | The location's `allowed_storage_class` must match the item. |
| `PUT-03` | Reroute | **No location available in the owner's zones:** direct to an overflow location in the same owner's zones (or a shared overflow area, if the operator has designated one) and raise an `exception` to the Warehouse Supervisor. Never place stock in another owner's zone. |
| `PUT-04` | Block | Stock is not `AVAILABLE` (not counted in ATP) until the putaway scan, including the check digit, is confirmed. |
| `PUT-05` | Block | Do not mix different lots in one location unless the location is configured for it. |

---

## 10. Supporting Processes

These were absent from the original draft. The prototype needs each one.

### 10.1 Returns (RMA)
A customer requests a return, a Sales Rep (on the owner's behalf) creates an `rma`, goods are received and inspected, and **disposition** is `RESTOCK`, `SCRAP`, or `RETURN_TO_VENDOR`. Restocked product re-enters via QC and Putaway. A credit memo is issued. **Rule `RMA-01` (Block):** returns must reference a shipped Sales Order and cannot exceed quantities shipped.

### 10.2 Cycle Counts and Inventory Adjustments
Routine counts, plus counts triggered by short picks. Variances above a threshold need Warehouse Supervisor approval; the **approver cannot be the person who requested** the adjustment. Every adjustment carries a `reason_code` (`DAMAGE`, `COUNT_VARIANCE`, `SHORT_PICK`, `EXPIRED`, `OTHER`). **Rule `ADJ-01` (Block):** cannot adjust stock below `qty_allocated`; allocations must be re-resolved first.

### 10.3 Backorders
Unfilled quantities (`qty_backordered`) remain open and are re-allocated automatically when stock arrives (oldest backorder first). **Rule `BKO-01` (Warn):** notify Sales when a backorder is aging past a configurable limit.

### 10.4 Invoicing and Accounts Receivable
Ship Confirm generates the `invoice`. Net Terms customers' `open_balance` is updated; card orders are captured. **Rule `INV-01` (Block):** invoices are generated only from shipped quantities, never ordered quantities.

### 10.5 Exceptions Queue
Every automated failure creates an `exception` with a `severity`, an `responsible_role`, and a status. Nothing fails silently. Open exceptions older than a set time escalate to the next role.

### 10.6 Owner Separation and Owner Portal
Several owners share one warehouse, so separation is enforced by rule, not by habit.

| Rule | Type | Check |
|---|---|---|
| `OWN-01` | Block | **Same-owner rule.** Every record in a transaction must belong to the same owner: an order's items, customer account, ship-to, lots, inventory, allocations, and pick tasks. A record from another owner is rejected. |
| `OWN-02` | Block | **No cross-owner stock.** Allocation, picking, loading, and Ship Confirm use only inventory whose `owner_id` equals the order's `owner_id`. One owner's shortage is never filled from another owner's stock. |
| `OWN-03` | Block | **Stock stays in its owner's area.** `inventory.owner_id` must equal the `owner_id` of its location's zone, unless the zone is shared. |
| `OWN-04` | Block | A zone's owner cannot be changed while the zone holds stock or has open tasks. Reassignment is logged with a reason code. |
| `OWN-05` | Block | **Portal users are view-only.** An Owner Viewer cannot create, change, or delete anything, sees only the owners on their access list, and sees only the fields allowed by `cfg.owner_portal_access`. Requests for another owner's records are refused and logged. |
| `OWN-06` | Reroute | An Owner Viewer can log in only while `cfg.owner_portal_access` for that owner is not `NONE`. If the operator sets it to `NONE`, active portal sessions end and new logins are refused. |
| `OWN-07` | Warn | Operator staff work in one owner's context at a time (working-owner selector). Reports that span owners are read-only and clearly labeled. Staff with `owner_scope = LISTED` can select only their listed owners. |

### 10.7 Billing Events (Future Module)
A warehouse that stores goods for owners normally charges them for storage, receiving, handling, and shipping. Oversight does not bill in v1, but it records a `billing_event` for each chargeable activity: pallet received (`RECEIPT`), put away (`PUTAWAY`), picked (`PICK`), shipped (`SHIP`), and a regular snapshot of the pallet positions each owner occupies (`STORAGE_SNAPSHOT`). Because storage zones belong to owners, occupied positions can be counted per owner directly. **Rule `BIL-01` (Block):** a billing event cannot be edited or deleted after it is recorded; corrections are new events with a reason code.

---

## 11. System-Wide Rules

| Area | Requirement |
|---|---|
| **Audit trail** | Every create, update, status change, scan, override, and login is written to `audit_log` with `user_id`, timestamp, old/new values, and `reason_code` where applicable. Logs are append-only. |
| **Permissions** | Role-based (Section 4). Overrides require a role above the user's level and a reason code. |
| **Concurrency** | Allocation, picking, and receiving use **atomic transactions** and **row locking**. Two browser sessions can never reserve or pick the same stock. |
| **Scanning** | All scans validate server-side against the expected record. A scan never writes to the database without validation. |
| **Time and duplicates** | Soft reservations, sessions, and tasks have timeouts; all scan endpoints are idempotent (a double-scan does not double-count). |
| **Browser operation** | Warehouse screens must work on handheld scanners and tablets; scan screens are single-purpose, with large touch targets and audible/visual error feedback. |
| **Data integrity** | Item Master completeness (`ITM-01`) is enforced before any item can appear on an order or Work Order. |
| **Owner separation** | Every query on owner-specific data is filtered by `owner_id` (or the user's allowed owners), enforced on the server so no screen, report, or scan can cross owners. See Section 10.6. |
| **Multi-site** | Controlled by the `MULTI_SITE` module (Section 12.6). `site_id` is stored on zone, inventory, orders, and settings from the start, so the operator can add warehouses without restructuring data. |

---

## 12. Configuration Settings (Operator-Defined Options)

Oversight is sold as software to warehouse operators, each running its own facility, and each warehouse may serve several owners. Business policies (what to do on a shortage, how long a reservation lasts, whether an audit is required) differ from one operator to the next, and often from one owner to the next. **These policies are therefore stored as settings the operator chooses, not hard-coded.**

**Guiding principle:** the system enforces the *mechanism* (an availability check always happens); the customer chooses the *policy* (what happens when that check fails).

### 12.1 Terms

| Term | Plain meaning |
|---|---|
| **Operator** | The company that installs and runs Oversight at its facility. Its System Admin sets policy for the whole installation. |
| **Owner** | A company whose goods are stored and shipped by the operator (the operator can be its own owner). Each owner's data is fully separated from every other owner's. |
| **Site** | One warehouse or plant belonging to the operator. |
| **Customer account** | A company an owner sells and ships to (a consignee). Not the same as an owner. |
| **Configuration Setting** | A named option with a value (for example `cfg.shortage_rule = PARTIAL_BACKORDER`). |
| **Default** | The value Oversight ships with, used until the operator changes it. |
| **Override** | A more specific value that wins over a broader one (for example, one customer account has its own shortage rule). |
| **Module** | A major feature area the operator can switch on or off (for example, Production). |

### 12.2 Configuration Hierarchy (Which Value Wins)

The system looks for a value from most specific to least specific and uses the first one it finds:

| Priority | Level | Example |
|---|---|---|
| 1 (wins) | **Entity override** (customer account, item, vendor, or carrier) | Customer account "Acme" (an owner's buyer) requires no lot mixing |
| 2 | **Owner** | Owner B uses a stricter shortage rule than Owner A |
| 3 | **Site** | Warehouse 2 uses a 15-minute reservation timeout |
| 4 | **Operator-wide** | The warehouse's standard shortage rule, applying to every owner without a value of its own |
| 5 (last) | **Oversight default** | Factory default |

Each setting declares which levels it may be set at (the `allowed_scopes` field below). Settings about the physical building (receiving, putaway, dock, scanning) are set at the operator or site level only, because every owner shares the same floor and equipment. Settings about commercial policy (shortage handling, shelf life, audit level, payment) may also be set per owner. Example: `cfg.shortage_rule` may be set operator-wide, per owner, or per customer account, but `cfg.session_timeout_minutes` only operator-wide.

### 12.3 Configuration Metadata

**Setting definition (`config_definition`)**: maintained by Oversight; tells the Settings screen how to display each option.

| Field | Description |
|---|---|
| `setting_key` (PK) | For example `shortage_rule` |
| `module` | Which module owns it (Section 12.6) |
| `label` | Name shown on screen |
| `help_text` | Plain-language explanation shown beside the field |
| `input_type` | `DROPDOWN`, `MULTI_SELECT`, `TOGGLE` (on/off), `NUMBER`, `PERCENT`, `DURATION` (minutes/hours/days), `CURRENCY`, `TEXT`, `ROLE_PICKER` |
| `allowed_values` | List of options (dropdowns) |
| `min_value`, `max_value` | Limits (numbers) |
| `default_value` | Oversight default |
| `allowed_scopes` | Which levels it may be set at |
| `required_permission` | Who may change it |
| `takes_effect` | `IMMEDIATE` or `NEW_TRANSACTIONS_ONLY` |
| `is_operator_editable` | On = the operator may change it; Off = locked at the default in v1 (Section 13.2) |
| `plan_tier` | Reserved for future license tiers (unused in v1) |
| `governs_rules` | Rule IDs affected (shown in the catalog below) |

**Setting value (`config_value`)**: one row per value the operator has chosen.

| Field | Description |
|---|---|
| `config_value_id` (PK) | Unique ID |
| `site_id` | Site (blank = not site-specific) |
| `scope_type`, `scope_id` | `OPERATOR`, `SITE`, `OWNER`, `CUSTOMER`, `ITEM`, `VENDOR`, `CARRIER`, and the ID of that entity (for example `OWNER` and an `owner_id`) |
| `setting_key` (FK) | Which setting |
| `setting_value` | The chosen value |
| `effective_from` | When it starts applying |
| `changed_by`, `changed_at`, `change_reason` | Who, when, why |

**Operator-maintained lists (`config_list` and `config_list_item`)**: simple data-entry lists the operator edits: reason codes, terms codes, storage classes, hazmat classes, equipment types, dock doors, zones. Fields: `list_key`, `item_code`, `item_label`, `is_active`, `sort_order`.

**Operator-added fields (`custom_field_definition`)**: lets the operator add fields to the item, customer, sales order, or lot screens without code changes. Fields: `entity_type`, `field_key`, `label`, `input_type`, `is_required`, `allowed_values`.

### 12.4 Configuration Rules

| Rule | Type | Check |
|---|---|---|
| `CFG-01` | Block | A value must pass the definition's type, `allowed_values`, and min/max limits. Dropdowns accept only listed options. |
| `CFG-02` | Block | Only users with the setting's `required_permission` may change it. |
| `CFG-03` | Reroute | Every change is written to `audit_log` with old value, new value, user, and reason. |
| `CFG-04` | Reroute | **Policy snapshot:** when an order is confirmed, the settings that govern it are copied onto the order (`sales_order.config_snapshot`). A later settings change never alters an order already in progress. The same applies to Work Orders and Purchase Orders. |
| `CFG-05` | Warn | Changing a setting that affects open records shows how many open records exist and whether the change applies to them (`takes_effect`). |
| `CFG-06` | Block | Deleting a value is allowed only by reverting to the inherited value; the inherited value always exists because every setting has a default. |
| `CFG-07` | Block | **Go-live gate:** an installation cannot enter live operation until the Setup Wizard has been completed (every required setting reviewed, even if the default is accepted), and a new owner cannot receive stock until its owner-level settings have been reviewed. |
| `CFG-08` | Block | Settings that would create an unsafe state are rejected (for example, a reservation timeout of 0 while reservations are enabled). |
| `CFG-09` | Block | Only operator staff with Settings permission may change a setting. Owner portal users are view-only and can never change one. |

### 12.5 Settings Catalog

**Notation:** *Scope* = levels at which it can be set (W = operator-wide, S = site, O = owner, C = customer account, I = item, V = vendor, K = carrier). *Input* = how the operator sets it. **Bold** values are the Oversight default. A value set at W applies to every owner unless an owner-level value overrides it.

#### Sales and Orders (`module = SALES`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `shortage_rule` | Dropdown | `REJECT_ORDER`, **`PARTIAL_BACKORDER`**, `SPLIT_SHIPMENT` | W, O, C | `CNF-03` |
| `soft_reservation_enabled` | Toggle | **On** / Off | W, O | `SO-04` |
| `soft_reservation_timeout_minutes` | Number | 5 to 1440 (**30**) | W, S, O | `SO-04` |
| `payment_types_enabled` | Multi-select | `NET_TERMS`, `CARD`, `PREPAID`, `COD`, `OWNER_MANAGED` (default **`NET_TERMS`, `CARD`**) | W, O | Stage 2 |
| `require_customer_po_number` | Toggle | **On** / Off | W, O, C | `PAY-01` |
| `duplicate_po_action` | Dropdown | **`BLOCK`**, `WARN`, `ALLOW` | W, O | `PAY-01` |
| `credit_check_mode` | Dropdown | **`BLOCK`**, `WARN`, `OFF` | W, O, C | `PAY-03`, `PAY-04` |
| `credit_override_roles` | Role picker | Any roles (**Credit Manager**) | W | `PAY-04` |
| `card_capture_timing` | Dropdown | `AT_CONFIRM`, **`AT_SHIP`** | W, O | `PAY-05`, `SHP-04` |
| `order_edit_lock_status` | Dropdown | `CONFIRMED`, `RELEASED`, **`PICKING`** (last status at which lines may still be edited) | W, O | `CNF-05` |
| `backorder_aging_days` | Number | 1 to 365 (**14**) | W, O, C | `BKO-01` |
| `order_number_format` | Text | Pattern such as `SO-{YYYY}-{SEQ:6}` | W, S, O | Stage 1 |
| `require_order_pricing` | Toggle | **On** / Off (Off for owners who bill their own customers) | W, O | `SO-06` |

#### Inventory and Allocation (`module = INVENTORY`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `default_rotation_rule` | Dropdown | **`FIFO`**, `FEFO` (items may override with their own `rotation_rule`) | W, O, I | `ALC-01` to `ALC-04`, `MAT-02` |
| `min_remaining_shelf_life_days` | Number | 0 to 3650 (**0** = no minimum) | W, O, C, I | `ALC-01`, `SO-07` |
| `allow_lot_mixing_on_order_line` | Toggle | On / **Off** | W, O, C | `ALC-03` |
| `prefer_full_pallet_picks` | Toggle | **On** / Off | W, S | `ALC-04` |
| `allocation_timing` | Dropdown | **`AT_CONFIRM`**, `AT_RELEASE` | W | Stage 3 and 4 |
| `reallocation_on_failure` | Dropdown | **`AUTO`**, `SUPERVISOR_DECIDES` | W | `ALC-05` |
| `adjustment_approval_threshold_qty` | Number | Quantity above which approval is needed (**0** = always) | W, S | `ADJ-01` |
| `cycle_count_frequency_days` | Number | By item class: A, B, C (**30 / 90 / 180**) | W, S, O | 10.2 |

#### Picking (`module = PICKING`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `short_pick_action` | Dropdown | **`AUTO_REALLOCATE`**, `REQUIRE_SUPERVISOR` | W, S | `PCK-04` |
| `short_pick_triggers_cycle_count` | Toggle | **On** / Off | W, S | `PCK-04` |
| `require_location_check_digit` | Toggle | **On** / Off | W, S | `PCK-02`, `PUT-04` |
| `overpick_tolerance_percent` | Percent | 0 to 10 (**0**) | W, O, I | `PCK-03` |
| `pick_reassignment_roles` | Role picker | Any roles (**Warehouse Supervisor**) | W | `PCK-05` |

#### Audit (`module = AUDIT`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `audit_mode` | Dropdown | **`FULL`**, `SAMPLE`, `NONE` | W, O, C | Stage 7 |
| `audit_sample_percent` | Percent | 1 to 100 (**20**; used only with `SAMPLE`) | W, O, C | Stage 7 |
| `audit_scan_level` | Dropdown | **`PALLET_AND_CARTON`**, `PALLET_ONLY` | W, O, C | `AUD-02` |
| `enforce_picker_auditor_separation` | Toggle | **On** / Off | W | `AUD-01` |
| `short_ship_approver_roles` | Role picker | Any roles (**Warehouse Supervisor**) | W | `AUD-04` |
| `short_ship_requires_customer_approval` | Toggle | **On** / Off | W, O, C | `AUD-04` |

#### Logistics, Dock, and Shipping (`module = LOGISTICS`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `truck_assignment_timing` | Dropdown | `AT_BOOKING`, **`AT_CHECK_IN`** | W, S | Stage 6 |
| `early_arrival_action` | Dropdown | **`WAIT_QUEUE`**, `BLOCK_CHECK_IN` | W, S | `TRK-04` |
| `require_carrier_insurance_check` | Toggle | **On** / Off | W | `TRK-01` |
| `require_scan_to_load` | Toggle | **On** / Off | W, S | `DCK-03` |
| `require_seal_number` | Toggle | **On** / Off | W, S, O | `DCK-05` |
| `pallet_count_variance_action` | Dropdown | `BLOCK`, **`WARN`** | W | `DCK-06` |
| `ship_confirm_roles` | Role picker | Any roles (**Logistics Manager**) | W | `SHP-02` |
| `invoice_trigger` | Dropdown | **`AT_SHIP_CONFIRM`**, `MANUAL`, `NONE` (accounting handled elsewhere) | W, O | `SHP-04`, `INV-01` |
| `weight_unit` / `dimension_unit` | Dropdown | `LB` or `KG` / `IN` or `CM` (**LB / IN**) | W | `LOG-01` |

Capacity limits are master data, not settings. Each `equipment_type` (53-foot trailer, box truck, and so on) has `max_weight`, `max_cube`, and `max_pallets`, entered by the customer and checked by `LOG-02`.

#### Purchasing and Replenishment (`module = PURCHASING`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `reorder_basis` | Dropdown | **`INVENTORY_POSITION`**, `ON_HAND_ONLY` (warns about duplicate-order risk) | W | `RPL-01`, `PUR-01` |
| `auto_create_work_orders` | Toggle | **On** / Off (Off = suggestion only) | W, O | Stage B1 |
| `auto_create_purchase_orders` | Toggle | **On** / Off | W, O | Stage B4 |
| `po_approval_threshold_amount` | Currency | 0 up (**0** = every PO needs approval) | W, O, V | `PUR-03` |
| `vendor_fallback_mode` | Dropdown | **`AUTO_NEXT_PRIORITY`**, `REQUIRE_APPROVAL` | W, O, I | `PUR-04` |
| `sourcing_escalation_hours` | Duration | 1 to 168 (**24**) | W | `PUR-05` |
| `receive_requires_po` | Toggle | **On** / Off (Off allows blind receiving) | W, O, V | `RCV-01` |
| `receipt_over_tolerance_percent` | Percent | 0 to 100 (**5**) | W, O, V, I | `RCV-02` |
| `receipt_under_tolerance_percent` | Percent | 0 to 100 (**5**) | W, O, V, I | `RCV-02` |
| `qc_on_receipt` | Dropdown | `ALWAYS`, **`BY_ITEM`**, `NEVER` | W, O, I | `RCV-04` |
| `expired_on_arrival_action` | Dropdown | **`REJECT_AND_RETURN`**, `QUARANTINE` | W, O | `RCV-05` |

#### Production (`module = PRODUCTION`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `partial_work_order_release` | Dropdown | **`WAIT_FOR_FULL_KIT`**, `ALLOW_PARTIAL` | W, O, I | `MAT-01` |
| `material_overissue_action` | Dropdown | `BLOCK`, **`REQUIRE_SUPERVISOR_REASON`** | W | `ISS-02` |
| `yield_tolerance_percent` | Percent | 0 to 100 (**5**) | W, O, I | `PRD-02` |
| `finished_goods_qc_required` | Dropdown | `ALWAYS`, **`BY_ITEM`**, `NEVER` | W, O, I | `PRD-03` |
| `lot_number_method` | Dropdown | **`AUTO_GENERATE`**, `MANUAL_ENTRY` | W, S, O | `PRD-01` |
| `lot_number_format` | Text | Pattern such as `{ITEM}-{YYMMDD}-{SEQ:3}` | W, S, O | `PRD-01` |

#### Putaway (`module = INVENTORY`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `putaway_strategy` | Dropdown | **`SAME_ITEM_CONSOLIDATE`**, `NEAREST_PICK_ZONE`, `FIXED_LOCATION` | W, S, O, I | Stage C2 |
| `allow_lot_mixing_in_location` | Toggle | On / **Off** | W, S, O | `PUT-05` |
| `no_location_action` | Dropdown | **`OVERFLOW_AND_ALERT`**, `BLOCK` | W, S | `PUT-03` |

#### System (`module = CORE`)

| Setting key | Input | Options / range | Scope | Governs |
|---|---|---|---|---|
| `exception_escalation_hours` | Duration | By severity: low, medium, high (**72 / 24 / 4**) | W | 10.5 |
| `session_timeout_minutes` | Number | 5 to 720 (**30**) | W | Section 11 |
| `notification_channels` | Multi-select | `IN_APP`, `EMAIL`, `SMS` (**`IN_APP`, `EMAIL`**) | W, O | 10.5 |
| `timezone`, `date_format`, `currency` | Dropdown | Standard lists | W, S, O | All screens |
| `reason_code_lists` | Data-entry lists | Operator-defined codes per area (override, adjustment, reopen, short-ship) | W | `AUD-04`, `AUD-05`, `ADJ-01` |
| `owner_portal_access` | Dropdown | **`NONE`**, `INVENTORY_VIEW`, `INVENTORY_AND_ORDERS_VIEW` (use only where the operator's agreement with the owner allows it) | W, O | `OWN-05`, `OWN-06` |

### 12.6 Modules (Turn Features On or Off)

Not every operator, or every owner, does everything. A distributor never manufactures; a manufacturer may keep invoicing in its own accounting software. Modules are switched on or off by the operator for the whole installation, and the operator may also switch a module off for an individual owner (an owner can never use a module the operator has switched off). Switching off hides the screens, stops the automated triggers, and removes the module's fields from required entry.

| Module key | Covers | Depends on |
|---|---|---|
| `SALES` | Sales orders, payment, allocation, release | `INVENTORY` |
| `INVENTORY` | Items, lots, locations, putaway, counts, adjustments | none (always on) |
| `PICKING` | Pick tasks, pick path | `SALES` |
| `AUDIT` | Order verification | `PICKING` |
| `LOGISTICS` | Shipments, carriers, dock, ship confirm | `SALES` |
| `PURCHASING` | Vendors, purchase orders, receiving | `INVENTORY` |
| `PRODUCTION` | BOM, work orders, material issue, production confirmation | `PURCHASING`, `INVENTORY` |
| `RETURNS` | RMA | `SALES` |
| `INVOICING` | Invoices and receivables | `SALES` |
| `MULTI_SITE` | More than one site per operator | `INVENTORY` |

| Rule | Type | Check |
|---|---|---|
| `MOD-01` | Block | A module cannot be switched off while it has open records (open orders, open work orders, open POs). The screen lists what must be closed first. |
| `MOD-02` | Block | A module cannot be switched on unless the modules it depends on are on. |
| `MOD-03` | Reroute | Switching off a module replaces its automatic steps with the defined bypass (for example, with `AUDIT` off, orders pass from `PICKED` straight to `STAGED`). Every bypassed step is recorded in `audit_log`. |
| `MOD-04` | Block | An owner-level module value can only narrow the operator-wide value: it may switch a module off for one owner, never on if the operator has it off. |

### 12.7 Rules That Are Never Configurable

Operators choose policy, but these protections protect inventory accuracy and cannot be turned off, because disabling any of them lets the data become wrong.

1. Stock is never silently oversold. Availability is re-checked inside the confirmation transaction.
2. Held, quarantined, damaged, and expired stock is never allocated.
3. Only the picker holding the task key can confirm that task.
4. Every scan is validated on the server against the expected record before it is saved.
5. Allocation, Ship Confirm, and Inventory Relief are atomic transactions.
6. The audit trail is append-only; no user or role can edit or delete it.
7. One owner can never see or affect another owner's data (stock, items, customer accounts, orders, history, settings). Operator staff reach an owner's data only through the owners allowed on their user record (`OWN-01`, `OWN-05`, `OWN-07`).
8. Item Master completeness (`ITM-01`) is enforced before an item can be sold or produced.
9. Stock does not count toward ATP until putaway is confirmed.
10. Configuration changes are always logged (`CFG-03`).
11. Stock is never allocated, picked, or shipped across owners (`OWN-02`).
12. Stock never sits in another owner's storage zone (`OWN-03`).
13. Owner portal users are always view-only (`OWN-05`).

### 12.8 Decisions That Remain With You (the Software Vendor)

These are product decisions about Oversight itself, not per-operator or per-owner policy. The assumed answers used for development and testing are recorded in [Section 13.1](#131-development-baseline-decisions).

| # | Decision | Why it matters |
|---|---|---|
| 1 | Final **default** for every setting in 12.5 | The defaults must make a new installation safe before the operator changes anything. |
| 2 | Which settings are **operator-wide only** versus overridable per owner, customer account, item, vendor, or carrier | The W / S / O letters in 12.5 are the working answer. More override levels mean more flexibility and more complexity to test. |
| 3 | Whether any settings are **locked by plan or license tier** | Controls what you can sell as basic versus premium. |
| 4 | **How an installation is delivered and first configured** (installer, first-run Setup Wizard) and who creates owners afterward | Drives `CFG-07` and onboarding effort. |
| 5 | Whether one shipment may hold **multiple orders** (v1: one order per shipment, so one owner per shipment) | Shipment data model |
| 6 | Whether **custom fields** (12.3) ship in v1 or later | Scope of the first release |
| 7 | **Database layout** (one database per installation shared by its owners, with `owner_id` on every owner-specific row, or a separate database per owner) | Isolation, backup, and reporting trade-offs |
| 8 | Whether the operator may add **custom roles**, or chooses only from the default roles | Affects `required_permission` design |
| 9 | **When to build owner billing** (storage, handling, and shipping charges) | v1 only records `billing_event` rows (Section 10.7). |
| 10 | **Owner portal scope**: which data owner staff may see (inventory only, orders, exact locations, pricing) | Affects `owner_portal_access` options and `OWN-05`. |
| 11 | How long owner stock may **sit in shared operational areas** before an alert is raised | Dwell-time exception rule (not yet defined). |

---

## 13. Prototype Readiness Checklist

Prospective operators are not yet known, so development and testing proceed on an **assumed baseline**. This section records that baseline: which decisions are assumed, which settings are fixed in v1 and which operators can define, how testing covers both, and what remains to validate with the first real operator.

### 13.0 Two Principles

1. **Every setting ships with a default.** The **bold** values in the Section 12.5 catalog are the development baseline. All testing starts from these defaults.
2. **Every setting is read through the configuration engine, including the ones fixed in v1.** A "hard-coded" setting is a setting whose `is_operator_editable` flag is **Off**; it is not a constant buried in program code. Unlocking it later means turning the flag On and adding a screen control, with no rewrite of the rule it governs.

### 13.1 Development Baseline Decisions

These answer the software-vendor decisions in Section 12.8. They are assumptions for development and testing, and each can be revisited when a real operator is onboarded.

| # | Decision | Assumed answer for development |
|---|---|---|
| 1 | Default for every setting | The bold values in Section 12.5 |
| 2 | Override levels exposed in v1 | **Operator-wide**, **Owner**, and **Customer account** (and **Item** where the catalog lists it). Site, vendor, and carrier overrides are stored in the data model but not shown on screens until `MULTI_SITE` is enabled. |
| 3 | Plan or license tiers | None in v1. `config_definition` reserves a `plan_tier` field so tiers can be added later. |
| 4 | Installation and owner setup | **You install and seed each installation** (an install script plus the first-run Setup Wizard for the operator). The operator's System Admin then creates owners, zones, and users inside the application. Self-service installation is later. |
| 5 | Orders per shipment | **One order per shipment** in v1, so every shipment belongs to exactly one owner. `shipment_id` stays separate from `so_id` so a later release can combine orders. |
| 6 | Customer-added fields (12.3) | **Deferred.** The data model reserves a `custom_data` field on item, customer, sales order, and lot records so they can be added later without restructuring. |
| 7 | Database layout | **One database per installation** (the operator's), shared by its owners, with `owner_id` on every owner-specific row. Owner separation is enforced in server code for every read and write. PostgreSQL row-level security is added later as a second safety net. |
| 8 | Roles | **Default roles only** (Section 4), including **Owner Viewer** for portal users. The mapping of role to permission is stored as data (`role_permission`), so custom roles can be added later. |
| 9 | Payment processing | A **simulated payment gateway** in v1. Authorize, capture, and void each return success or failure on demand, so every `PAY-` rule can be tested. Owners who bill their own customers use payment type `OWNER_MANAGED`. |
| 10 | Outside integrations | **None in v1.** Carriers, vendor ASNs, and accounting exports are entered manually or imported from a file. Opening stock for an owner is loaded by an `OPENING_BALANCE` inventory adjustment (reason code, approval, and audit trail like any other adjustment). |
| 11 | Zone ownership | **Each storage zone is assigned to exactly one owner, and locations are never shared between owners.** Ownership is stored on the zone, and locations inherit it. |
| 12 | Shared operational areas | **Receiving, staging, dock doors, and quarantine are shared** by all owners (assumed; to confirm). Inventory sitting there keeps its own `owner_id`. |
| 13 | Owner portal | **View-only and off by default** (`owner_portal_access = NONE`). The operator turns it on per owner, only where its agreement with that owner allows. `INVENTORY_VIEW` shows item, lot, quantity, status, expiration, and zone, with no pricing. |
| 14 | Owner billing | **Not built in v1.** `billing_event` rows are recorded from the start so a billing module can be added later. |

### 13.2 Which Settings Are Fixed and Which Operators Define

`config_definition` carries one field for this split:

| Field | Description |
|---|---|
| `is_operator_editable` | **On** = shown on the Settings screen; the operator chooses the value. **Off** = locked at its default in v1; hidden from the Settings screen, and rejected if an API call tries to change it. |

**Tier A: Operator-definable in v1.** These appear on the Settings screen as dropdowns, toggles, numbers, or role pickers. Every option of each setting is tested.

| Area | Settings (`cfg.` keys) |
|---|---|
| Sales | `shortage_rule`, `soft_reservation_enabled`, `soft_reservation_timeout_minutes`, `payment_types_enabled`, `credit_check_mode`, `require_order_pricing` |
| Inventory | `default_rotation_rule`, `min_remaining_shelf_life_days`, `allow_lot_mixing_on_order_line` |
| Picking | `short_pick_action` |
| Audit | `audit_mode`, `audit_sample_percent`, `enforce_picker_auditor_separation` |
| Logistics | `require_seal_number`, `invoice_trigger`, `weight_unit`, `dimension_unit` |
| Purchasing | `auto_create_work_orders`, `auto_create_purchase_orders`, `po_approval_threshold_amount`, `receipt_over_tolerance_percent`, `receipt_under_tolerance_percent`, `qc_on_receipt` |
| Production | `partial_work_order_release`, `yield_tolerance_percent`, `finished_goods_qc_required`, `lot_number_format` |
| Putaway | `putaway_strategy`, `allow_lot_mixing_in_location` |
| System | `session_timeout_minutes`, `timezone`, `date_format`, `currency`, `reason_code_lists`, `owner_portal_access` |
| Modules | Every module switch in Section 12.6 except `INVENTORY` (always on) |

**Tier B: Locked at the default in v1.** These are read through the configuration engine but cannot be changed by the operator. Each is tested at its default value.

| Area | Settings (`cfg.` keys) and the value used in v1 |
|---|---|
| Sales | `require_customer_po_number` (On), `duplicate_po_action` (`BLOCK`), `credit_override_roles` (Credit Manager), `card_capture_timing` (`AT_SHIP`), `order_edit_lock_status` (`PICKING`), `backorder_aging_days` (14), `order_number_format` (`SO-{YYYY}-{SEQ:6}`) |
| Inventory | `prefer_full_pallet_picks` (On), `allocation_timing` (`AT_CONFIRM`), `reallocation_on_failure` (`AUTO`), `adjustment_approval_threshold_qty` (0, always approve), `cycle_count_frequency_days` (30 / 90 / 180) |
| Picking | `short_pick_triggers_cycle_count` (On), `require_location_check_digit` (On), `overpick_tolerance_percent` (0), `pick_reassignment_roles` (Warehouse Supervisor) |
| Audit | `audit_scan_level` (`PALLET_AND_CARTON`), `short_ship_approver_roles` (Warehouse Supervisor), `short_ship_requires_customer_approval` (On) |
| Logistics | `truck_assignment_timing` (`AT_CHECK_IN`), `early_arrival_action` (`WAIT_QUEUE`), `require_carrier_insurance_check` (On), `require_scan_to_load` (On), `pallet_count_variance_action` (`WARN`), `ship_confirm_roles` (Logistics Manager) |
| Purchasing | `reorder_basis` (`INVENTORY_POSITION`), `vendor_fallback_mode` (`AUTO_NEXT_PRIORITY`), `sourcing_escalation_hours` (24), `receive_requires_po` (On), `expired_on_arrival_action` (`REJECT_AND_RETURN`) |
| Production | `material_overissue_action` (`REQUIRE_SUPERVISOR_REASON`), `lot_number_method` (`AUTO_GENERATE`) |
| Putaway | `no_location_action` (`OVERFLOW_AND_ALERT`) |
| System | `exception_escalation_hours` (72 / 24 / 4), `notification_channels` (`IN_APP`, `EMAIL`) |

**Likely first unlock requests from real operators** (so the design should keep these easy to open up): `order_edit_lock_status`, `ship_confirm_roles`, `short_ship_approver_roles`, `card_capture_timing`, `receive_requires_po`, `require_scan_to_load`, `allocation_timing`.

**Why these were locked.** Tier B settings are either safety-critical (`reorder_basis`, `require_location_check_digit`, `require_scan_to_load`), tied to integrations that do not exist yet (`card_capture_timing`, `notification_channels`), or low-impact policy tuning that no operator has asked for. Locking them keeps v1 testable without removing the ability to open them later.

### 13.3 Development Rules for Defaults and Settings

| Rule | Type | Check |
|---|---|---|
| `DEV-01` | Block | **No business policy as a literal in program code.** Every value in Section 12.5 is read through the configuration engine. Code review rejects any rule that compares against a fixed number, status, or role that belongs in the catalog. |
| `DEV-02` | Block | A write to a Tier B setting (`is_operator_editable = Off`) is rejected by the server with a "setting locked" message, even from an API call. |
| `DEV-03` | Reroute | **Wizard writes explicit values.** When the Setup Wizard completes (`CFG-07`), it saves an explicit operator-wide value for every Tier A setting, even where the operator accepted the default. A later release that changes an Oversight default therefore never silently changes an existing installation's behavior. |
| `DEV-04` | Block | **Unlock procedure.** Making a Tier B setting operator-editable requires: turning `is_operator_editable` On, adding the Settings screen control, adding tests for every option, and listing it in the release notes. |
| `DEV-05` | Block | **Test matrix.** Every Tier A setting is tested at every allowed option. Every Tier B setting is tested at its default. The matrix is generated from `config_definition`, so a new setting cannot be added without its tests. |
| `DEV-06` | Warn | **Combination tests.** Settings that interact are tested together, at minimum: `shortage_rule` with `soft_reservation_enabled`; `audit_mode` with `enforce_picker_auditor_separation`; `partial_work_order_release` with `finished_goods_qc_required`; owner-level values overriding operator-wide values; and each module switched off with its `MOD-03` bypass. |
| `DEV-07` | Block | **Cross-owner tests.** Every screen, report, and API call that reads or writes owner-specific data has a test in which a user of Owner A attempts the same action on Owner B's records and must be refused (`OWN-01` to `OWN-05`). |

### 13.4 Test Fixtures

One sample installation ("Test Warehouse", a single site) with **two owners** proves that the same code behaves differently under different settings and that owners stay separated. Both owners share the same building, floor equipment, and dock doors.

| | **Owner A: "Distributor"** | **Owner B: "Manufacturer"** |
|---|---|---|
| Purpose | All Tier A settings at the Oversight default | Tier A settings deliberately set away from the default |
| Modules on | `SALES`, `INVENTORY`, `PICKING`, `AUDIT`, `LOGISTICS`, `INVOICING`, `RETURNS` | All modules |
| Modules off (for this owner) | `PURCHASING`, `PRODUCTION` (stock loaded by `OPENING_BALANCE`) | None |
| `shortage_rule` | `PARTIAL_BACKORDER` | `REJECT_ORDER` |
| `default_rotation_rule` | `FIFO` | `FEFO` |
| `soft_reservation_timeout_minutes` | 30 | 10 |
| `audit_mode` | `FULL` | `SAMPLE` at 20% |
| `partial_work_order_release` | n/a | `ALLOW_PARTIAL` |
| `finished_goods_qc_required` | n/a | `ALWAYS` |
| `po_approval_threshold_amount` | n/a | 5000 |
| Receipt tolerances (over / under) | n/a | 2% / 2% |
| `putaway_strategy` | `SAME_ITEM_CONSOLIDATE` | `NEAREST_PICK_ZONE` |
| `owner_portal_access` | `INVENTORY_VIEW` | `NONE` |

Operator-wide settings (the same for both owners): units `LB` / `IN`, `enforce_picker_auditor_separation` Off (small crew), and all other Tier A and Tier B settings at their defaults.

**Seed data** (enough to run every rule at least once):

- **Zones:** storage zones A1 to A3 assigned to Owner A; B1 to B3 assigned to Owner B; shared zones for receiving, staging, 3 dock doors, and quarantine.
- **Items (about 12 per owner):** finished goods covering FIFO ambient, FEFO with expiration, cold storage, and hazmat; raw materials for two BOMs (Owner B); one item with missing weight data to trigger `ITM-01`. The same SKU (for example `1001`) exists under both owners.
- **Customer accounts (about 5 per owner):** good standing on Net Terms; near credit limit; on credit hold; prepaid card; one requiring 30 days of remaining shelf life; one that disallows lot mixing.
- **Locations (about 20 per owner zone group):** pallet rack, case pick, and overflow, plus one blocked and one under count.
- **Vendors (3, Owner B only):** with primary, secondary, and tertiary priority on one material, and a second material where all three are out of stock (`PUR-05`).
- **Equipment types (2):** a box truck and a 53-foot trailer, shared by both owners.
- **Users:** one test user for each role in Section 4, plus a second Order Picker (to test `PCK-01` and `AUD-01`), one staff user limited to Owner A only, and one Owner Viewer for each owner.
- **Payment gateway stub:** switch to force authorization success, failure, or void.

**Cross-owner scenarios to test (required):**

1. An Owner A order cannot allocate Owner B's stock, even when Owner A has a shortage (`OWN-02`).
2. Putaway of an Owner A pallet into an Owner B zone is refused (`OWN-03`, `PUT-01`).
3. A zone holding stock cannot be reassigned to another owner (`OWN-04`).
4. The Owner A Viewer can see only Owner A inventory and cannot change anything; asking for an Owner B record by ID is refused (`OWN-05`).
5. The Owner B Viewer cannot log in while `owner_portal_access = NONE` (`OWN-06`).
6. Both owners can have an item with the same SKU without conflict.
7. The staff user limited to Owner A sees no Owner B screens or reports.

### 13.5 Checklist

The concept is complete when items 1–4 are signed off. Items 5–9 are the first steps of prototyping.

- [x] **1. Defaults and software-vendor decisions** assumed for development (Sections 13.1 and 13.2). To be revisited with the first real operator (13.6).
- [x] **2. Test fixtures specified** (13.4): one installation with two differently configured owners and seed data, in place of real customer data.
- [x] **3. Status transitions** defined (Section 6) and accepted as the development baseline. Operational leads at the first real operator will review them (13.6).
- [x] **4. Roles and permissions** defined as the default role set (Section 4), including Owner Viewer, with one seeded test user per role.
- [ ] **5. Data model (entity-relationship diagram)** drawn from Sections 5 and 12.3, including `owner_id`, `site_id`, `zone`, `user_owner_access`, `custom_data`, `is_operator_editable`, `role_permission`, and `billing_event`.
- [ ] **6. Screen inventory** listed per role. Include the screens added by the owner and configuration models: **Settings screen** (built from `config_definition`), **Setup Wizard**, **Module switches**, **Owner Admin** and **Zone Assignment** (operator System Admin only), the **working-owner selector**, and the view-only **Owner Portal**, alongside Sales order entry, Picker handheld, Audit station, Dock screen, Receiving, Putaway, and Exceptions queue.
- [ ] **7. Test scenario list** written from the rule IDs, the `DEV-05` matrix, and the cross-owner scenarios (13.4): one test per rule, each governed rule tested under every Tier A option, plus end-to-end happy paths for Processes A, B, and C for both sample owners.
- [ ] **8. Configuration engine specified:** lookup order (12.2), policy snapshot (`CFG-04`), locked-setting enforcement (`DEV-02`), and setting-change logging (`CFG-03`).
- [ ] **9. Prototype scope chosen** (13.7).

### 13.6 To Validate With the First Real Operator

Nothing below blocks development. Each is an assumption that a real operator may overturn.

| # | Assumption to confirm |
|---|---|
| 1 | The Tier A / Tier B split matches what this operator needs to control |
| 2 | Default roles match how their teams are actually organized (and whether they need custom roles) |
| 3 | The order and inventory status models match how their floor describes its work |
| 4 | Units, currency, time zone, and number formats |
| 5 | Which payment, carrier, and accounting integrations they require first |
| 6 | Whether orders ever need to be combined on one shipment |
| 7 | Whether they need fields we did not define (custom fields, 13.1 decision 6) |
| 8 | Lot number format, location naming, and label and barcode standards (LPN, SSCC) |
| 9 | Their opening inventory and how it will be loaded |
| 10 | Whether receiving, staging, dock doors, and quarantine are truly shared, and how long owner stock may sit in them |
| 11 | What their agreements with owners allow owners to see in the portal |
| 12 | How owners are billed today, and which warehouse activities they charge for (decides the future billing module) |
| 13 | How often zones are reassigned between owners (for example when an owner moves out) |

### 13.7 Recommended Build Order

The configuration engine goes first, because every rule in this README reads a setting.

1. **Foundation:** operator, site, owner, zone, and user-access model; roles and permissions; audit log; configuration engine (`config_definition`, `config_value`, lookup, snapshot, locked-setting enforcement).
2. **Master data:** Item Master, customer accounts, locations, lots, inventory records, with `owner_id` separation tested (`DEV-07`).
3. **Process A slice:** Sales Order, ATP, soft reservation, confirmation and allocation, pick tasks, audit, load, Ship Confirm. Run for both sample owners.
4. **Settings screen and Setup Wizard** for Tier A settings.
5. **Owner Portal** (view-only), after separation rules are proven.
6. **Process B and C** (replenishment, receiving, production, putaway), which reuse the allocation, status, and exception machinery from step 3.
7. **Supporting processes:** returns, cycle counts, backorders, invoicing, exceptions queue. Owner billing follows as a separate module.

---

## 14. Change Log

| Version | Change |
|---|---|
| 2.0 | First corrected README: jargon with plain-language captions, metadata field names, rule IDs, status models, supporting processes. |
| 2.1 | Operator-configurable policy: settings catalog, configuration hierarchy, modules, rules that are never configurable. |
| 2.2 | Development baseline: fixed versus definable settings (Tier A / Tier B), development rules, test fixtures, build order. |
| 2.3 | Owner model for shared (3PL-style) warehouses: operator and owner roles, owner-assigned zones, shared operational areas, owner separation rules, view-only Owner Portal, billing events, warehouse-wide versus per-owner settings. |

**Maintenance rule:** whenever a design decision changes, this README is updated in the same step and the change is added to this log.
