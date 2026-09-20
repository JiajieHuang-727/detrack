require "test_helper"

class AddressTest < ActiveSupport::TestCase
  test "valid with an address and coordinates" do
    record = Address.new(
      address: "25 Pitt St, Hurstville NSW",
      lat: -33.949285,
      long: 151.098093
    )

    assert record.valid?
    assert record.save
    assert record.id.present?
    assert_instance_of BigDecimal, record.lat
    assert_instance_of BigDecimal, record.long
  end

  test "invalid without an address" do
    record = Address.new(lat: -33.9, long: 151.1)
    assert_not record.valid?
    assert_includes record.errors[:address], "can't be blank"
  end

  test "invalid when address is already taken" do
    Address.create!(address: "25 Pitt St, Hurstville NSW", lat: -33.9, long: 151.1)
    duplicate = Address.new(address: "25 Pitt St, Hurstville NSW", lat: -33.8, long: 151.2)

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:address], "has already been taken"
  end

  test "cannot destroy an address used by a delivery" do
    record = Address.create!(address: "25 Pitt St, Hurstville NSW", lat: -33.9, long: 151.1)
    Delivery.create!(
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address_id: record.id
    )

    assert_not record.destroy
    assert_includes record.errors.full_messages, "Cannot delete record because dependent deliveries exist"
    assert Address.exists?(record.id)
    assert Delivery.exists?("TV-300001")
  end
end


