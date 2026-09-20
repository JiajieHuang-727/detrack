require "csv"

module Api
  module V1
    class DeliveriesController < ApplicationController
      def index
        deliveries = Delivery.includes(:address).order(created_at: :desc)
        if params[:status].present?
          unless Delivery.statuses.key?(params[:status])
            return render json: { errors: [ "Status is not included in the list" ] },
              status: :bad_request
          end

          deliveries = deliveries.where(status: params[:status])
        end

        render json: deliveries
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

      def import
        result = DeliveryCsvImporter.new(params.require(:file)).call
        render json: { imported: result.imported, errors: result.errors }
      rescue CSV::MalformedCSVError => exception
        render json: { errors: [ exception.message ] }, status: :bad_request
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
