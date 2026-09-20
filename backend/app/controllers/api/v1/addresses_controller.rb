module Api
  module V1
    class AddressesController < ApplicationController
      include Paginatable

      before_action :set_address, only: %i[update destroy]

      def index
        render json: paginated(Address.order(created_at: :desc, id: :desc))
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
        if @address.destroy
          head :no_content
        else
          render json: { errors: @address.errors.full_messages }, status: :unprocessable_content
        end
      rescue ActiveRecord::InvalidForeignKey
        render json: { errors: [ "Cannot delete record because dependent deliveries exist" ] },
          status: :unprocessable_content
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
