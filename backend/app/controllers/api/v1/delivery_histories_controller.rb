module Api
  module V1
    class DeliveryHistoriesController < ApplicationController
      def index
        delivery = Delivery.find(params.expect(:delivery_id))
        histories = delivery.delivery_histories.order(created_at: :desc)

        render json: histories.as_json(only: [ :id, :status, :created_at ])
      end
    end
  end
end
