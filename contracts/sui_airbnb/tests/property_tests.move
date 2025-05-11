#[test_only]
module sui_airbnb::property_tests {
    use sui::test_scenario;
    use sui_airbnb::property::{Self, Property};
    
    #[test]
    fun test_create_property() {
        let owner = @0xCAFE;
        
        let mut scenario_val = test_scenario::begin(owner);
        let scenario = &mut scenario_val;
        
        // Create a property
        test_scenario::next_tx(scenario, owner);
        {
            property::create_property(
                100, // price_per_day
                0,   // ROOM type
                b"Cozy room in downtown",
                1,   // num_rooms
                b"123 Main St, City",
                test_scenario::ctx(scenario)
            );
        };
        
        // Verify property was created
        test_scenario::next_tx(scenario, owner);
        {
            let property = test_scenario::take_from_sender<Property>(scenario);
            assert!(property::get_price_per_day(&property) == 100, 0);
            assert!(property::get_property_type(&property) == 0, 1);
            assert!(property::get_num_rooms(&property) == 1, 2);
            test_scenario::return_to_sender(scenario, property);
        };
        
        test_scenario::end(scenario_val);
    }
}