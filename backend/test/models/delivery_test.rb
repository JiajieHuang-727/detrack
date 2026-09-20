require "test_helper"

class DeliveryTest < ActiveSupport::TestCase
  def known_address
    "25 Pitt St, Hurstville NSW"
  end

  setup do
    @address = Address.create!(address: known_address, lat: -33.949285, long: 151.098093)
  end

  def valid_attrs
    {
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address_id: @address.id,
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

  test "invalid when address_id does not exist" do
    delivery = Delivery.new(valid_attrs.merge(address_id: -1))
    assert_not delivery.valid?
    assert_includes delivery.errors[:address], "must exist"
  end

  test "created can become picked_up or failed" do
    pickup = Delivery.create!(valid_attrs)
    assert pickup.update(status: :picked_up)

    failed = Delivery.create!(valid_attrs.merge(reference: "TV-FAIL"))
    assert failed.update(status: :failed)
  end

  test "picked_up cannot skip to delivered" do
    delivery = Delivery.create!(valid_attrs.merge(status: :picked_up, reference: "TV-SKIP"))
    assert_not delivery.update(status: :delivered)
    assert_includes delivery.errors[:status], "cannot change from picked_up to delivered"
  end

  test "delivered cannot change status" do
    delivery = Delivery.create!(valid_attrs.merge(status: :delivered, reference: "TV-DONE"))
    assert_not delivery.update(status: :failed)
    assert_includes delivery.errors[:status], "cannot change from delivered to failed"
  end

  test "lock reloads status before validating a transition" do
    delivery = Delivery.create!(valid_attrs.merge(status: :in_transit, reference: "TV-LOCK"))
    stale = Delivery.find("TV-LOCK")
    delivery.update!(status: :delivered)

    Delivery.transaction do
      stale.lock!
      assert stale.delivered?
      assert_not stale.update(status: :failed)
      assert_includes stale.errors[:status], "cannot change from delivered to failed"
    end
  end

  test "row lock serializes conflicting status writes" do
    Delivery.create!(valid_attrs.merge(status: :in_transit, reference: "TV-RACE"))

    locked = Queue.new
    outcomes = Queue.new

    locker = Thread.new do
      ApplicationRecord.connection_pool.with_connection do
        Delivery.transaction do
          record = Delivery.lock.find("TV-RACE")
          locked << true
          sleep 0.15
          outcomes << [ record.update(status: :delivered), record.status ]
        end
      end
    end

    waiter = Thread.new do
      locked.pop
      ApplicationRecord.connection_pool.with_connection do
        Delivery.transaction do
          record = Delivery.lock.find("TV-RACE")
          outcomes << [ record.update(status: :failed), record.status, record.errors[:status] ]
        end
      end
    end

    [ locker, waiter ].each(&:join)

    first, second = outcomes.pop, outcomes.pop
    assert_equal [ true, "delivered" ], first
    assert_equal false, second[0]
    assert_includes second[2], "cannot change from delivered to failed"
    assert Delivery.find("TV-RACE").delivered?
  end
end
