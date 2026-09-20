module Api
  module V1
    class AddressesController < ApplicationController
      before_action :set_address, only: %i[update destroy]

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

      def update
        if @address.update(address_params)
          render json: @address
        else
          render json: { errors: @address.errors.full_messages }, status: :unprocessable_content
        end
      end

      def destroy
        @address.destroy!
        head :no_content
      end

      private

      def set_address
        @address = Address.find(params.expect(:id))
      end

      def address_params
        params.expect(address: [ :address, :lat, :long ])
      end
    end
  end
end
