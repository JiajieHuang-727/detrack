require "test_helper"

class DeliveryTest < ActiveSupport::TestCase
  def valid_attrs
    {
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address: "25 Pitt St, Hurstville NSW",
      status: :created,
      time_window_start: "08:00",
      time_window_end: "10:00"
    }
  end

  test "valid with required fields" do
    delivery = Delivery.new(valid_attrs)
    assert delivery.valid?
  end

  test "uses reference as the primary key" do
    delivery = Delivery.create!(valid_attrs)
    assert_equal "TV-300001", delivery.id
    assert_equal delivery, Delivery.find("TV-300001")
  end

  test "defaults status to created" do
    delivery = Delivery.create!(valid_attrs.except(:status))
    assert delivery.created?
  end

  test "rejects an unknown status" do
    delivery = Delivery.new(valid_attrs.merge(status: "pending"))
    assert_not delivery.valid?
    assert_includes delivery.errors[:status], "is not included in the list"
  end

  test "invalid without a reference" do
    delivery = Delivery.new(valid_attrs.merge(reference: ""))
    assert_not delivery.valid?
    assert_includes delivery.errors[:reference], "can't be blank"
  end

  test "invalid when reference already exists" do
    Delivery.create!(valid_attrs)
    duplicate = Delivery.new(valid_attrs.merge(customer_name: "Other"))

    assert_not duplicate.valid?
    assert_includes duplicate.errors.full_messages, "Reference TV-300001 already exists"
  end
end
