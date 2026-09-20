module Api
  module V1
    class AddressesController < ApplicationController
      def index
        render json: Address.order(created_at: :desc)
      end

      def create
        record = Address.new(address_params)

        if record.save
          render json: record, status: :created
        else
          render json: { errors: record.errors.full_messages }, status: :unprocessable_content
        end
      end

      private

      def address_params
        params.expect(address: [ :address, :lat, :long ])
      end
    end
  end
end
