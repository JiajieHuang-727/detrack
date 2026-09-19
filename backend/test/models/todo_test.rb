require "test_helper"

class TodoTest < ActiveSupport::TestCase
  test "valid with a title" do
    todo = Todo.new(title: "Buy oat milk")
    assert todo.valid?
    assert_not todo.completed
  end

  test "invalid without a title" do
    todo = Todo.new(title: "")
    assert_not todo.valid?
    assert_includes todo.errors[:title], "can't be blank"
  end

  test "invalid when title is longer than 255 characters" do
    todo = Todo.new(title: "a" * 256)
    assert_not todo.valid?
    assert_includes todo.errors[:title], "is too long (maximum is 255 characters)"
  end
end
