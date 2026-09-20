module Api
  module V1
    class DeliveriesController < ApplicationController
      def index
        render json: Delivery.order(created_at: :desc)
      end

      def create
        delivery = Delivery.new(delivery_params)
        delivery.status = :created

        if delivery.save
          render json: delivery, status: :created
        else
          render json: { errors: delivery.errors.full_messages }, status: :unprocessable_content
        end
      rescue ActiveRecord::RecordNotUnique
        render json: { errors: [ "Reference #{delivery.reference} already exists" ] },
          status: :unprocessable_content
      end

      private

      def delivery_params
        params.expect(delivery: [
          :reference,
          :customer_name,
          :address,
          :time_window_start,
          :time_window_end
        ])
      end
    end
  end
end
