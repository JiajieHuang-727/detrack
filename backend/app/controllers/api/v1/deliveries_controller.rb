require "csv"

module Api
  module V1
    class DeliveriesController < ApplicationController
      include Paginatable

      SORT_COLUMNS = {
        "reference" => { table: :deliveries, column: :reference },
        "customer_name" => { table: :deliveries, column: :customer_name },
        "address" => { table: :addresses, column: :address, join: true },
        "lat" => { table: :addresses, column: :lat, join: true },
        "long" => { table: :addresses, column: :long, join: true },
        "status" => { table: :deliveries, column: :status },
        "window" => { table: :deliveries, column: :time_window_start }
      }.freeze

      def index
        deliveries = Delivery.includes(:address)
        if params[:status].present?
          unless Delivery.statuses.key?(params[:status])
            return render json: { errors: [ "Status is not included in the list" ] },
              status: :bad_request
          end

          deliveries = deliveries.where(status: params[:status])
        end

        render json: paginated(sorted_deliveries(deliveries))
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

      def sorted_deliveries(scope)
        sort = SORT_COLUMNS[params[:sort].to_s]
        direction = params[:dir].to_s.downcase
        invalid_dir = params[:dir].present? && !%w[asc desc].include?(direction)

        if sort.nil? || invalid_dir
          return scope.order(created_at: :desc, reference: :desc)
        end

        direction = direction == "desc" ? :desc : :asc
        scope = scope.left_joins(:address) if sort[:join]

        if params[:sort].to_s == "window"
          return scope.order(time_window_start: direction, time_window_end: direction, reference: direction)
        end

        table = Arel::Table.new(sort[:table])
        scope.order(table[sort[:column]].send(direction), Delivery.arel_table[:reference].send(direction))
      end

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
