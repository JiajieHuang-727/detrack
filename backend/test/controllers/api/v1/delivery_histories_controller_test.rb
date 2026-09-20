require "test_helper"

class Api::V1::DeliveryHistoriesControllerTest < ActionDispatch::IntegrationTest
  CSV_HEADER = "reference,customer_name,address,latitude,longitude,status,time_window"

  def known_address
    "25 Pitt St, Hurstville NSW"
  end

  setup do
    @address = Address.create!(address: known_address, lat: -33.949285, long: 151.098093)
  end

  def attrs(overrides = {})
    {
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address_id: @address.id,
      time_window_start: "08:00",
      time_window_end: "10:00"
    }.merge(overrides)
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

  test "create via API records one created history" do
    post api_v1_deliveries_url, params: { delivery: attrs }, as: :json

    assert_response :created

    get api_v1_delivery_histories_url("TV-300001")

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.size
    assert_equal "created", body.first["status"]
    assert body.first["id"].present?
    assert body.first["created_at"].present?
    assert_equal %w[created_at id status], body.first.keys.sort
  end

  test "csv import completed records one delivered history" do
    file = upload_csv(
      [
        "TV-MAP-2",
        "Coastal Electronics",
        %("#{known_address}"),
        "-33.949285",
        "151.098093",
        "completed",
        "08:00-10:00"
      ].join(",")
    )

    post import_api_v1_deliveries_url, params: { file: file }

    assert_response :success
    assert Delivery.find("TV-MAP-2").delivered?

    get api_v1_delivery_histories_url("TV-MAP-2")

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body.size
    assert_equal "delivered", body.first["status"]
  end

  test "patch created to picked_up returns two histories newest first" do
    post api_v1_deliveries_url, params: { delivery: attrs }, as: :json
    assert_response :created

    patch api_v1_delivery_url("TV-300001"), params: { delivery: { status: "picked_up" } }, as: :json
    assert_response :success

    get api_v1_delivery_histories_url("TV-300001")

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal %w[picked_up created], body.pluck("status")
    assert_operator Time.iso8601(body.first["created_at"]), :>=, Time.iso8601(body.second["created_at"])
  end

  test "index returns not found for an unknown reference" do
    get api_v1_delivery_histories_url("NO-SUCH-REF")

    assert_response :not_found
  end
end
