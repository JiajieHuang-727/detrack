class DropTodos < ActiveRecord::Migration[8.1]
  def change
    drop_table :todos, if_exists: true do |t|
      t.boolean :completed, default: false, null: false
      t.datetime :created_at, null: false
      t.string :title, null: false
      t.datetime :updated_at, null: false
      t.index :completed
      t.index :created_at
    end
  end
end
