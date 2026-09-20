class Delivery < ApplicationRecord
  self.primary_key = "reference"

  enum :status, {
    created: "created",
    picked_up: "picked_up",
    in_transit: "in_transit",
    delivered: "delivered",
    failed: "failed"
  }, validate: true

  validates :reference, presence: true, uniqueness: { message: "%{value} already exists" }
  validates :customer_name, :address, presence: true
end
