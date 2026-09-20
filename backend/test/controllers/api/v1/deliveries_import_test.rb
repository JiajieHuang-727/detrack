require "test_helper"

class Api::V1::DeliveriesImportTest < ActionDispatch::IntegrationTest
  CSV_HEADER = "reference,customer_name,address,latitude,longitude,status,time_window"

  def known_address
    "25 Pitt St, Hurstville NSW"
  end

  def csv_row(overrides = {})
    values = {
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address: known_address,
      latitude: "-33.949285",
      longitude: "151.098093",
      status: "pending",
      time_window: "08:00-10:00"
    }.merge(overrides)

    [
      values[:reference],
      values[:customer_name],
      %("#{values[:address]}"),
      values[:latitude],
      values[:longitude],
      values[:status],
      values[:time_window]
    ].join(",")
  end

  def upload_csv(*rows)
    file = Tempfile.new([ "deliveries", ".csv" ])
    file.write(([ CSV_HEADER ] + rows).join("\n") + "\n")
    file.flush
    file.rewind
    @uploaded_files = Array(@uploaded_files) << file
    Rack::Test::UploadedFile.new(file.path, "text/csv", original_filename: "deliveries.csv")
  end

  teardown do
    Array(@uploaded_files).each do |file|
      file.close
      file.unlink
    rescue Errno::ENOENT
      nil
    end
  end

  test "maps pending completed and failed statuses" do
    file = upload_csv(
      csv_row(reference: "TV-MAP-1", status: "pending"),
      csv_row(reference: "TV-MAP-2", status: "completed", address: "215 Pitt St, Newtown NSW", latitude: "-33.909712", longitude: "151.162838"),
      csv_row(reference: "TV-MAP-3", status: "failed", address: "322 Burwood Rd, Mascot NSW", latitude: "-33.941048", longitude: "151.18233")
    )

    post import_api_v1_deliveries_url, params: { file: file }

    assert_response :success
    body = JSON.parse(response.body)
    statuses = body["imported"].to_h { |row| [ row["reference"], row["status"] ] }

    assert_equal "created", statuses["TV-MAP-1"]
    assert_equal "delivered", statuses["TV-MAP-2"]
    assert_equal "failed", statuses["TV-MAP-3"]
    assert_empty body["errors"]
    assert Delivery.find("TV-MAP-1").created?
    assert Delivery.find("TV-MAP-2").delivered?
    assert Delivery.find("TV-MAP-3").failed?
  end

  test "reuses an existing address and creates a missing one" do
    existing = Address.create!(address: known_address, lat: -33.949285, long: 151.098093)

    file = upload_csv(
      csv_row(reference: "TV-ADDR-1", latitude: "-10.0", longitude: "10.0"),
      csv_row(
        reference: "TV-ADDR-2",
        address: "215 Pitt St, Newtown NSW",
        latitude: "-33.909712",
        longitude: "151.162838"
      )
    )

    assert_difference("Address.count", 1) do
      post import_api_v1_deliveries_url, params: { file: file }
    end

    assert_response :success
    body = JSON.parse(response.body)
    imported = body["imported"].index_by { |row| row["reference"] }

    assert_equal existing.id, imported["TV-ADDR-1"]["address_id"]
    assert_equal known_address, imported["TV-ADDR-1"]["address"]
    assert_equal "-33.949285", BigDecimal(imported["TV-ADDR-1"]["lat"].to_s).to_s("F")
    assert_equal "151.098093", BigDecimal(imported["TV-ADDR-1"]["long"].to_s).to_s("F")
    assert_equal existing.lat, Address.find(existing.id).lat
    assert_equal existing.long, Address.find(existing.id).long

    new_address = Address.find_by!(address: "215 Pitt St, Newtown NSW")
    assert_equal new_address.id, imported["TV-ADDR-2"]["address_id"]
    assert_equal "-33.909712", BigDecimal(new_address.lat.to_s).to_s("F")
    assert_equal "151.162838", BigDecimal(new_address.long.to_s).to_s("F")
  end

  test "skips duplicate references and still imports remaining rows" do
    address = Address.create!(address: known_address, lat: -33.949285, long: 151.098093)
    Delivery.create!(
      reference: "TV-300001",
      customer_name: "Existing",
      address: address,
      status: :created
    )

    file = upload_csv(
      csv_row(reference: "TV-300001", customer_name: "Should Skip"),
      csv_row(
        reference: "TV-300002",
        customer_name: "Silverline Supplies",
        address: "215 Pitt St, Newtown NSW",
        latitude: "-33.909712",
        longitude: "151.162838"
      ),
      csv_row(reference: "TV-300002", customer_name: "Same File Duplicate")
    )

    assert_difference("Delivery.count", 1) do
      post import_api_v1_deliveries_url, params: { file: file }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [ "TV-300002" ], body["imported"].pluck("reference")
    assert_includes body["errors"], "Row 2 (TV-300001): reference already exists"
    assert_includes body["errors"], "Row 4 (TV-300002): reference already exists"
    assert_equal "Existing", Delivery.find("TV-300001").customer_name
    assert_equal "Silverline Supplies", Delivery.find("TV-300002").customer_name
  end

  test "rejects a missing file" do
    post import_api_v1_deliveries_url, params: {}

    assert_response :bad_request
    assert_includes JSON.parse(response.body)["errors"].join, "file"
  end
end
