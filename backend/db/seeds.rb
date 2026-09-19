Todo.destroy_all

Todo.create!(
  [
    { title: "Set up the Rails API and PostgreSQL", completed: true },
    { title: "Build the React todo interface", completed: true },
    { title: "Add a task, mark it done, then delete it", completed: false }
  ]
)
