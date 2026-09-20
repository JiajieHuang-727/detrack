require "csv"

class DeliveryCsvImporter
  Result = Struct.new(:imported, :errors, keyword_init: true)

  STATUS_MAP = {
    "pending" => "created",
    "completed" => "delivered",
    "failed" => "failed"
  }.freeze

  REQUIRED_HEADERS = %i[
    reference
    customer_name
    address
    latitude
    longitude
    status
    time_window
  ].freeze

  def initialize(file)
    @file = file
  end

  def call
    table = parse_table
    imported = []
    errors = []
    seen_references = {}
    addresses = {}

    table.each.with_index(2) do |row, line|
      reference = cell(row, :reference)

      if reference.present? && (seen_references[reference] || Delivery.exists?(reference))
        errors << row_error(line, reference, "reference already exists")
        next
      end

      status = STATUS_MAP[cell(row, :status).downcase]
      unless status
        errors << row_error(line, reference, "unknown status \"#{cell(row, :status)}\"")
        next
      end

      address = resolve_address(row, line, reference, addresses, errors)
      next unless address

      start_time, end_time = parse_time_window(cell(row, :time_window))
      delivery = Delivery.new(
        reference: reference,
        customer_name: cell(row, :customer_name),
        address: address,
        status: status,
        time_window_start: start_time,
        time_window_end: end_time
      )

      if delivery.save
        seen_references[reference] = true if reference.present?
        imported << delivery
      else
        errors << row_error(line, reference, delivery.errors.full_messages.join(", "))
      end
    rescue ActiveRecord::RecordNotUnique
      errors << row_error(line, reference, "reference already exists")
    end

    Result.new(imported: imported, errors: errors)
  end

  private

  def parse_table
    table = CSV.parse(read_content, headers: true, header_converters: :symbol)
    headers = Array(table.headers).map { |header| header&.to_sym }
    missing = REQUIRED_HEADERS - headers
    raise CSV::MalformedCSVError.new("Missing columns: #{missing.join(", ")}", 1) if missing.any?

    table
  end

  def read_content
    io = source_io
    content = io.read
    raise CSV::MalformedCSVError.new("CSV file is empty", 1) if content.blank?

    content
  end

  def source_io
    if @file.respond_to?(:tempfile)
      @file.tempfile.tap(&:rewind)
    elsif @file.respond_to?(:rewind)
      @file.tap(&:rewind)
    else
      StringIO.new(@file.to_s)
    end
  end

  def resolve_address(row, line, reference, addresses, errors)
    text = cell(row, :address)
    return addresses[text] if addresses.key?(text)

    existing = Address.find_by(address: text)
    if existing
      addresses[text] = existing
      return existing
    end

    record = Address.new(
      address: text,
      lat: cell(row, :latitude),
      long: cell(row, :longitude)
    )

    if record.save
      addresses[text] = record
      record
    else
      errors << row_error(line, reference, record.errors.full_messages.join(", "))
      nil
    end
  rescue ActiveRecord::RecordNotUnique
    found = Address.find_by!(address: text)
    addresses[text] = found
    found
  end

  def parse_time_window(value)
    return [ nil, nil ] if value.blank?

    start_time, end_time = value.split("-", 2).map { |part| part&.strip }
    [ start_time.presence, end_time.presence ]
  end

  def cell(row, key)
    row[key].to_s.strip
  end

  def row_error(line, reference, reason)
    if reference.present?
      "Row #{line} (#{reference}): #{reason}"
    else
      "Row #{line}: #{reason}"
    end
  end
end
