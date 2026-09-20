require "test_helper"

class Api::V1::DeliveriesControllerTest < ActionDispatch::IntegrationTest
  def known_address
    "25 Pitt St, Hurstville NSW"
  end

  setup do
    Address.create!(address: known_address, lat: -33.949285, long: 151.098093)
  end

  def attrs(overrides = {})
    {
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address: "25 Pitt St, Hurstville NSW",
      time_window_start: "08:00",
      time_window_end: "10:00"
    }.merge(overrides)
  end

  test "index returns deliveries newest first" do
    older = Delivery.create!(attrs.merge(reference: "TV-OLD", created_at: 1.day.ago))
    newer = Delivery.create!(attrs.merge(reference: "TV-NEW"))

    get api_v1_deliveries_url

    assert_response :success
    refs = JSON.parse(response.body).pluck("reference")
    assert_equal [ newer.reference, older.reference ], refs
  end

  test "create persists a delivery" do
    assert_difference("Delivery.count", 1) do
      post api_v1_deliveries_url, params: { delivery: attrs }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "TV-300001", body["reference"]
    assert_equal "created", body["status"]
    assert_equal "-33.949285", BigDecimal(body["lat"].to_s).to_s("F")
    assert_equal "151.098093", BigDecimal(body["long"].to_s).to_s("F")
  end

  test "create always starts as created" do
    post api_v1_deliveries_url,
      params: { delivery: attrs.merge(reference: "TV-300099", status: "failed") },
      as: :json

    assert_response :created
    assert_equal "created", JSON.parse(response.body)["status"]
    assert Delivery.find("TV-300099").created?
  end

  test "create rejects a duplicate reference" do
    Delivery.create!(attrs)

    assert_no_difference("Delivery.count") do
      post api_v1_deliveries_url, params: { delivery: attrs.merge(customer_name: "Other") }, as: :json
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Reference TV-300001 already exists"
  end

  test "create rejects a blank reference" do
    assert_no_difference("Delivery.count") do
      post api_v1_deliveries_url, params: { delivery: attrs.merge(reference: "") }, as: :json
    end

    assert_response :unprocessable_content
  end

  test "create rejects an unknown address" do
    assert_no_difference("Delivery.count") do
      post api_v1_deliveries_url,
        params: { delivery: attrs.merge(reference: "TV-UNKNOWN", address: "Nowhere St") },
        as: :json
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Address must match an existing address"
  end

  test "update advances created to picked_up" do
    delivery = Delivery.create!(attrs)

    patch api_v1_delivery_url(delivery), params: { delivery: { status: "picked_up" } }, as: :json

    assert_response :success
    assert_equal "picked_up", JSON.parse(response.body)["status"]
    assert delivery.reload.picked_up?
  end

  test "update rejects an illegal transition" do
    delivery = Delivery.create!(attrs)

    patch api_v1_delivery_url(delivery), params: { delivery: { status: "delivered" } }, as: :json

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Status cannot change from created to delivered"
    assert delivery.reload.created?
  end
end
