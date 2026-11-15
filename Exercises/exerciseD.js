// Exercise D, expanded. Combine the earlier exercises in one file:

// Put your items in an array, and add a status field to each (ACTIVE, DISCONTINUED, or BLOCKED, as in README Section 5.1). Make at least five items, covering a complete one, one with a zero value, one with an absent field, and a couple with non-ACTIVE statuses.
// Write one loop over the array that handles each item. For each one, skip anything that isn’t ACTIVE. Validate the rest. If it passes, calculate its pallet weight and print it. If it fails, print the item’s ID and the missing fields.
// The if/else appears once, inside the loop. If you’ve written it three times, something’s off.

// Wiring validation to the weight calculation matters because right now palletWeight runs on items that failed validation, which is the silent-zero situation rule LOG-01 is meant to stop. A validation that doesn’t guard anything isn’t doing its job yet.

// For reference, search “MDN for...of” and “MDN Array filter” (which you know), and think about whether you’d rather use filter first and then loop, or loop once with a condition inside. Both work. Try one, then explain why you chose it. If you have energy for it, try the other and compare.

// Before moving on, commit this version. I’d like to see your commit message, and git log --oneline.

const inventoryRecords = [
    {
    item_id: "ITEM-001",
    owner_id: "OWNER-001",
    sku: "JUICE-APPLE-1L",
    description: "Shelf-stable apple juice, 1-liter carton",
    item_type: "finished_good",
    status: "active",
    base_uom: "each",
    units_per_case: 12,
    cases_per_pallet: 60,
    unit_weight: 1.05,
    case_weight: 13.1,
    pallet_tare_weight: 25,
    case_length: 40,
    case_width: 30,
    case_height: 25,
    min_order_quantity: 12,
    order_multiple: 12,
    is_lot_controlled: "yes",
    has_expiration: "yes",
    shelf_life_days: 365,
    rotation_rule: "FIFO",
    storage_class: "ambient",
    is_hazmat: "no",
    hazmat_class: "not_applicable",
    reorder_point: 240,
    safety_stock: 120,
    max_level: 1440,
    lead_time_days: 7,
    default_location_zone: "AMBIENT-A",
    },
    {
    item_id: "ITEM-002",
    owner_id: "OWNER-001",
    sku: "BOTTLE-GLASS-500ML",
    description: "Reusable glass water bottle, 500 milliliters",
    item_type: "finished_good",
    status: "active",
    base_uom: "each",
    units_per_case: 24,
    cases_per_pallet: 48,
    unit_weight: 0.35,
    case_weight: 9.2,
    pallet_tare_weight: 25,
    case_length: 45,
    case_width: 0,
    case_height: 28,
    min_order_quantity: 24,
    order_multiple: 24,
    is_lot_controlled: "yes",
    has_expiration: "no",
    shelf_life_days: null,
    rotation_rule: "FIFO",
    storage_class: "ambient",
    is_hazmat: "no",
    hazmat_class: "not_applicable",
    reorder_point: 288,
    safety_stock: 144,
    max_level: 2304,
    lead_time_days: 14,
    default_location_zone: "AMBIENT-B",
    },
    {
    item_id: "ITEM-003",
    owner_id: "OWNER-002",
    sku: "FLOUR-WHEAT-5KG",
    description: "Wheat flour, 5-kilogram bag",
    item_type: "raw_material",
    status: "active",
    base_uom: "bag",
    units_per_case: 4,
    cases_per_pallet: 40,
    unit_weight: 5.05,
    pallet_tare_weight: 25,
    case_length: 50,
    case_width: 35,
    case_height: 30,
    min_order_quantity: 8,
    order_multiple: 4,
    is_lot_controlled: "no",
    has_expiration: "yes",
    shelf_life_days: 180,
    rotation_rule: "FEFO",
    storage_class: "ambient",
    is_hazmat: "no",
    hazmat_class: "not_applicable",
    reorder_point: 80,
    safety_stock: 40,
    max_level: 320,
    lead_time_days: 5,
    default_location_zone: "DRY-RAW-A",
    },
    {
    item_id: "ITEM-004",
    owner_id: "OWNER-002",
    sku: "YOGURT-PLAIN-150G",
    description: "Plain yogurt, 150-gram cup",
    item_type: "finished_good",
    status: "inactive",
    base_uom: "each",
    units_per_case: 12,
    cases_per_pallet: 100,
    unit_weight: 0.16,
    case_weight: 2.12,
    pallet_tare_weight: 25,
    case_length: 32,
    case_width: 24,
    case_height: 12,
    min_order_quantity: 24,
    order_multiple: 12,
    is_lot_controlled: "yes",
    has_expiration: "yes",
    shelf_life_days: 30,
    rotation_rule: "FEFO",
    storage_class: "cold",
    is_hazmat: "no",
    hazmat_class: "not_applicable",
    reorder_point: 120,
    safety_stock: 60,
    max_level: 600,
    lead_time_days: 2,
    default_location_zone: "CHILL-A",
    },
    {
    item_id: "ITEM-005",
    owner_id: "OWNER-003",
    sku: "PEAS-FROZEN-1KG",
    description: "Frozen green peas, 1-kilogram bag",
    item_type: "finished_good",
    status: "inactive",
    base_uom: "bag",
    units_per_case: 10,
    cases_per_pallet: 70,
    unit_weight: 1.02,
    case_weight: 10.7,
    pallet_tare_weight: 25,
    case_length: 40,
    case_width: 30,
    case_height: 22,
    min_order_quantity: 20,
    order_multiple: 10,
    is_lot_controlled: "yes",
    has_expiration: "yes",
    shelf_life_days: 540,
    rotation_rule: "FEFO",
    storage_class: "frozen",
    is_hazmat: "no",
    hazmat_class: "not_applicable",
    reorder_point: 200,
    safety_stock: 100,
    max_level: 1400,
    lead_time_days: 10,
    default_location_zone: "FREEZER-A",
    },
];
 const requiredKeys = ["units_per_case", "cases_per_pallet",  "unit_weight", "case_weight", "case_length", "case_width", "case_height"];

    function runValidate (product) {

        const invalidKeys = requiredKeys.filter(key => !product[key]);
        
        return invalidKeys;
    }

    function palletWeight(item) {
        const skidWeight = item.case_weight * item.cases_per_pallet;
        return (skidWeight);
    }

inventoryRecords.forEach(record => {
    if (record.status !== "active") return;

   const invalidKeys = runValidate(record);

   if (invalidKeys.length ===0) {
    console.log(record.item_id);

    console.log(palletWeight(record));
   }else {
    console.log(record.item_id);
    console.log(invalidKeys);
   }});