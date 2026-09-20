class CreateDeliveries < ActiveRecord::Migration[8.1]
  def change
    create_enum :delivery_status, %w[created picked_up in_transit delivered failed]

    create_table :deliveries, id: false do |t|
      t.string :reference, null: false, primary_key: true
      t.string :customer_name, null: false
      t.string :address, null: false
      t.enum :status, enum_type: :delivery_status, default: "created", null: false
      t.time :time_window_start
      t.time :time_window_end

      t.timestamps
    end

    add_index :deliveries, :status
  end
end
