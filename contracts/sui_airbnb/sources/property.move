module sui_airbnb::property {

    // Property types
    const ROOM: u8 = 0;
    const APARTMENT: u8 = 1;
    const HOUSE: u8 = 2;
    
    // Error codes
    const EInvalidPropertyType: u64 = 1;
    
    // Property struct
    public struct Property has key, store {
        id: UID,
        owner: address,
        price_per_day: u64,
        property_type: u8,
        description: vector<u8>,
        num_rooms: u64,
        address: vector<u8>,
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
    
    // Getter functions
    public fun get_price_per_day(property: &Property): u64 {
        property.price_per_day
    }

    public fun get_property_type(property: &Property): u8 {
        property.property_type
    }

    public fun get_num_rooms(property: &Property): u64 {
        property.num_rooms
    }
    
    // Create a new property listing
    public entry fun create_property(
        price_per_day: u64,
        property_type: u8,
        description: vector<u8>,
        num_rooms: u64,
        address: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Validate property type
        assert!(property_type <= HOUSE, EInvalidPropertyType);
        
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
        
        // Transfer the property to the owner
        transfer::transfer(property, tx_context::sender(ctx));
    }
    
}