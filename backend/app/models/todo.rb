class Todo < ApplicationRecord
  validates :title, presence: true, length: { maximum: 255 }
  validates :completed, inclusion: { in: [ true, false ] }
end
