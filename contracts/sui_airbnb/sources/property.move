module sui_airbnb::property;

use std::string::String;
use sui::event;

public enum PropertyType has copy, drop, store {
    ROOM,
    APARTMENT,
    HOUSE,
}

public fun room(): PropertyType {
    PropertyType::ROOM
}

public fun apartment(): PropertyType {
    PropertyType::APARTMENT
}

public fun house(): PropertyType {
    PropertyType::HOUSE
}

public struct SuiAirbnbAdmin has key {
    id: UID,
}

// Property struct
public struct Property has key, store {
    id: UID,
    owner: address,
    price_per_day: u64,
    property_type: PropertyType,
    description: String,
    num_rooms: u64,
    address: String,
    is_available: bool,
}

// Booking struct
public struct Booking has key, store {
    id: UID,
    property_id: address,
    guest: address,
    check_in_date: u64,
    check_out_date: u64,
    total_price: u64,
}

// Events
public struct PropertyCreated has copy, drop {
    property_id: ID,
    owner: address,
    price_per_day: u64,
    property_type: PropertyType,
    num_rooms: u64,
}

// Functions

fun init(ctx: &mut TxContext) {
    let admin = SuiAirbnbAdmin {
        id: object::new(ctx),
    };

    transfer::transfer(admin, tx_context::sender(ctx));
}

public fun get_price_per_day(property: &Property): u64 {
    property.price_per_day
}

public fun get_property_type(property: &Property): PropertyType {
    property.property_type
}

public fun get_num_rooms(property: &Property): u64 {
    property.num_rooms
}

// Create a new property listing
#[allow(lint(self_transfer))]
public fun create_property(
    price_per_day: u64,
    property_type: PropertyType,
    description: String,
    num_rooms: u64,
    address: String,
    ctx: &mut TxContext,
) {
    let property = Property {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        price_per_day,
        property_type,
        description,
        num_rooms,
        address,
        is_available: true,
    };

    let property_id = object::id(&property);
    event::emit(PropertyCreated {
        property_id,
        owner: ctx.sender(),
        price_per_day,
        property_type,
        num_rooms,
    });

    // Transfer the property to the owner
    transfer::transfer(property, ctx.sender());
}
