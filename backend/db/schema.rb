# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_20_080000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  # Custom types defined in this database.
  # Note that some types may not work with other database engines. Be careful if changing database.
  create_enum "delivery_status", ["created", "picked_up", "in_transit", "delivered", "failed"]

  create_table "addresses", force: :cascade do |t|
    t.string "address", null: false
    t.datetime "created_at", null: false
    t.decimal "lat", precision: 10, scale: 6
    t.decimal "long", precision: 10, scale: 6
    t.datetime "updated_at", null: false
    t.index ["address"], name: "index_addresses_on_address", unique: true
  end

  create_table "deliveries", primary_key: "reference", id: :string, force: :cascade do |t|
    t.bigint "address_id", null: false
    t.datetime "created_at", null: false
    t.string "customer_name", null: false
    t.enum "status", default: "created", null: false, enum_type: "delivery_status"
    t.time "time_window_end"
    t.time "time_window_start"
    t.datetime "updated_at", null: false
    t.index ["address_id"], name: "index_deliveries_on_address_id"
    t.index ["status"], name: "index_deliveries_on_status"
  end

  create_table "delivery_histories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "delivery_reference", null: false
    t.enum "status", null: false, enum_type: "delivery_status"
    t.index ["delivery_reference", "created_at"], name: "index_delivery_histories_on_delivery_reference_and_created_at"
  end

  add_foreign_key "deliveries", "addresses", on_delete: :restrict
  add_foreign_key "delivery_histories", "deliveries", column: "delivery_reference", primary_key: "reference", on_delete: :cascade
end
