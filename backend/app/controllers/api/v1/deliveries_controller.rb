module Api
  module V1
    class DeliveriesController < ApplicationController
      def index
        render json: Delivery.includes(:address).order(created_at: :desc)
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

      def update
        delivery = Delivery.transaction do
          record = Delivery.lock.find(params.expect(:id))
          record.update(status_params)
          record
        end

        if delivery.errors.empty?
          render json: delivery
        else
          render json: { errors: delivery.errors.full_messages }, status: :unprocessable_content
        end
      end

      private

      def delivery_params
        params.expect(delivery: [
          :reference,
          :customer_name,
          :address_id,
          :time_window_start,
          :time_window_end
        ])
      end

      def status_params
        params.expect(delivery: [ :status ])
      end
    end
  end
end
