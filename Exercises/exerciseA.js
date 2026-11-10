const PlaceHolder1 = {
    item_id: "00001",
    sku: "00000001",
    description: "Product1",
    item_type: "FINISHED_GOOD",
    has_expiration: false,
    units_per_case: 10,
    cases_per_pallet: 75,
    unit_weight: .2,
    case_weight: 2,
    case_length: 12,
    case_width: 6,
    case_height: 4,
};

const PlaceHolder2 = {
    item_id: "00002",
    sku: "00000002",
    description: "Product2",
    item_type: "FINISHED_GOOD",
    has_expiration: false,
    units_per_case: 10,
    cases_per_pallet: 75,
    unit_weight:.25,
    case_weight: 2.5,
    case_length: 0,
    case_width: 0,
    case_height: 0,
};

const PlaceHolder3 = {
    item_id: "00003",
    sku: "00000003",
    description: "Product3",
    item_type: "FINISHED_GOOD",
    has_expiration: true,
    units_per_case: 10,
    cases_per_pallet: 75,
    case_weight: 0,
    case_length: 7,
    case_width: 9,
    case_height: 3,
};

const requiredKeys = ["units_per_case", "cases_per_pallet",  "unit_weight", "case_weight", "case_length", "case_width", "case_height"];

function runValidate (product) {

    const invalidKeys = requiredKeys.filter(key => !product[key]);
    
    return invalidKeys;
}

const item1 = runValidate(PlaceHolder1);
const item2 = runValidate(PlaceHolder2);
const item3 = runValidate(PlaceHolder3);

if (item1.length === 0) {
        console.log("sellable\n");
    }else {
        console.log (`Not Sellable, missing ${item1}.\n`);
    }

    if (item2.length === 0) {
        console.log("sellable\n");
    }else {
        console.log (`Not Sellable, missing ${item2}.\n`);
    }

    if (item3.length === 0) {
        console.log("sellable\n");
    }else {
        console.log (`Not Sellable, missing ${item3}.\n`);
    }

function palletWeight(item) {
    const skidWeight = item.case_weight * item.cases_per_pallet;
    return (skidWeight);
}

const p1Weight = palletWeight(PlaceHolder1);
const p2Weight = palletWeight(PlaceHolder2);
