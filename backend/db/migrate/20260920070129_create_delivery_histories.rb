class CreateDeliveryHistories < ActiveRecord::Migration[8.1]
  def up
    create_table :delivery_histories do |t|
      t.string :delivery_reference, null: false
      t.enum :status, enum_type: :delivery_status, null: false
      t.datetime :created_at, null: false
    end

    add_foreign_key :delivery_histories, :deliveries,
      column: :delivery_reference,
      primary_key: :reference,
      on_delete: :cascade

    add_index :delivery_histories, [ :delivery_reference, :created_at ]

    execute <<~SQL
      INSERT INTO delivery_histories (delivery_reference, status, created_at)
      SELECT reference, status, created_at
      FROM deliveries
    SQL
  end

  def down
    drop_table :delivery_histories
  end
end
