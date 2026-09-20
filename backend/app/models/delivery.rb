class Delivery < ApplicationRecord
  self.primary_key = "reference"

  TRANSITIONS = {
    "created" => %w[picked_up failed],
    "picked_up" => %w[in_transit failed],
    "in_transit" => %w[delivered failed],
    "delivered" => [],
    "failed" => []
  }.freeze

  belongs_to :address

  enum :status, {
    created: "created",
    picked_up: "picked_up",
    in_transit: "in_transit",
    delivered: "delivered",
    failed: "failed"
  }, validate: true

  validates :reference, presence: true, uniqueness: { message: "%{value} already exists" }
  validates :customer_name, presence: true
  validate :status_transition_allowed, if: -> { will_save_change_to_status? && !new_record? }

  def next_statuses
    TRANSITIONS.fetch(status)
  end

  def as_json(options = {})
    super(options).merge(
      "address" => address&.address,
      "lat" => address&.lat,
      "long" => address&.long
    )
  end

  private

  def status_transition_allowed
    from = status_in_database
    allowed = TRANSITIONS.fetch(from, [])
    return if allowed.include?(status)

    errors.add(:status, "cannot change from #{from} to #{status}")
  end
end
