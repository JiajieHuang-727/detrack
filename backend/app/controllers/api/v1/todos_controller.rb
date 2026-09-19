module Api
  module V1
    class TodosController < ApplicationController
      before_action :set_todo, only: %i[show update destroy]

      def index
        render json: Todo.order(created_at: :desc)
      end

      def show
        render json: @todo
      end

      def create
        todo = Todo.new(todo_params)

        if todo.save
          render json: todo, status: :created
        else
          render json: { errors: todo.errors.full_messages }, status: :unprocessable_content
        end
      end

      def update
        if @todo.update(todo_params)
          render json: @todo
        else
          render json: { errors: @todo.errors.full_messages }, status: :unprocessable_content
        end
      end

      def destroy
        @todo.destroy!
        head :no_content
      end

      private

      def set_todo
        @todo = Todo.find(params.expect(:id))
      end

      def todo_params
        params.expect(todo: [ :title, :completed ])
      end
    end
  end
end
