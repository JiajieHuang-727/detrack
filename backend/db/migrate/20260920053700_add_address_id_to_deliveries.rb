class AddAddressIdToDeliveries < ActiveRecord::Migration[8.1]
  def up
    add_reference :deliveries, :address, foreign_key: false, null: true

    execute <<~SQL
      UPDATE deliveries
      SET address_id = addresses.id
      FROM addresses
      WHERE addresses.address = deliveries.address
    SQL

    unmatched = select_all(<<~SQL)
      SELECT reference, address
      FROM deliveries
      WHERE address_id IS NULL
    SQL

    if unmatched.any?
      details = unmatched.map { |row| "#{row['reference']} (#{row['address']})" }.join(", ")
      raise "Cannot add address_id: unmatched deliveries: #{details}"
    end

    change_column_null :deliveries, :address_id, false
    add_foreign_key :deliveries, :addresses, on_delete: :restrict
    remove_column :deliveries, :address
  end

  def down
    add_column :deliveries, :address, :string

    execute <<~SQL
      UPDATE deliveries
      SET address = addresses.address
      FROM addresses
      WHERE addresses.id = deliveries.address_id
    SQL

    change_column_null :deliveries, :address, false
    remove_foreign_key :deliveries, :addresses
    remove_reference :deliveries, :address
  end
end
