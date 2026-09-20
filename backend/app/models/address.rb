class Address < ApplicationRecord
  has_many :deliveries, dependent: :restrict_with_error

  validates :address, presence: true, uniqueness: true
  validates :lat, presence: true, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :long, presence: true, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
end
