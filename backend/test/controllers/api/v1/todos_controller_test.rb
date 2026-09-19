require "test_helper"

class Api::V1::TodosControllerTest < ActionDispatch::IntegrationTest
  setup do
    @todo = Todo.create!(title: "Write tests", completed: false)
  end

  test "index returns todos newest first" do
    older = Todo.create!(title: "Older item", created_at: 1.day.ago)

    get api_v1_todos_url

    assert_response :success
    titles = JSON.parse(response.body).pluck("title")
    assert_equal [ @todo.title, older.title ], titles
  end

  test "create persists a todo" do
    assert_difference("Todo.count", 1) do
      post api_v1_todos_url, params: { todo: { title: "Ship the app" } }, as: :json
    end

    assert_response :created
    assert_equal "Ship the app", JSON.parse(response.body)["title"]
  end

  test "create rejects a blank title" do
    assert_no_difference("Todo.count") do
      post api_v1_todos_url, params: { todo: { title: "" } }, as: :json
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Title can't be blank"
  end

  test "update toggles completed" do
    patch api_v1_todo_url(@todo), params: { todo: { completed: true } }, as: :json

    assert_response :success
    assert @todo.reload.completed
  end

  test "destroy removes the todo" do
    assert_difference("Todo.count", -1) do
      delete api_v1_todo_url(@todo)
    end

    assert_response :no_content
  end

  test "show returns not found for a missing id" do
    get api_v1_todo_url(id: 0)

    assert_response :not_found
  end
end
