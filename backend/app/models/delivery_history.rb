class DeliveryHistory < ApplicationRecord
  belongs_to :delivery, foreign_key: :delivery_reference, primary_key: :reference, inverse_of: :delivery_histories

  enum :status, {
    created: "created",
    picked_up: "picked_up",
    in_transit: "in_transit",
    delivered: "delivered",
    failed: "failed"
  }, validate: true
end
