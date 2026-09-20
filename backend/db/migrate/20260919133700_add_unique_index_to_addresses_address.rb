class AddUniqueIndexToAddressesAddress < ActiveRecord::Migration[8.1]
  def change
    remove_index :addresses, :address
    add_index :addresses, :address, unique: true
  end
end
