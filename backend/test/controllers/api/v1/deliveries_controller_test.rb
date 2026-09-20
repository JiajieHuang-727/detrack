require "test_helper"

class Api::V1::DeliveriesControllerTest < ActionDispatch::IntegrationTest
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

  test "index returns deliveries newest first" do
    older = Delivery.create!(attrs.merge(reference: "TV-OLD", created_at: 1.day.ago))
    newer = Delivery.create!(attrs.merge(reference: "TV-NEW"))

    get api_v1_deliveries_url

    assert_response :success
    body = JSON.parse(response.body)
    refs = body["items"].pluck("reference")
    assert_equal [ newer.reference, older.reference ], refs
    assert_equal 1, body["page"]
    assert_equal 20, body["per_page"]
    assert_equal 2, body["total"]
  end

  test "index paginates deliveries" do
    21.times do |index|
      Delivery.create!(attrs.merge(reference: "TV-#{index.to_s.rjust(3, "0")}", created_at: index.minutes.ago))
    end

    get api_v1_deliveries_url, params: { page: 2, per_page: 20 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["items"].length
    assert_equal 2, body["page"]
    assert_equal 21, body["total"]
    assert_equal 2, body["total_pages"]
  end

  test "index filters by status" do
    Delivery.create!(attrs.merge(reference: "TV-CREATED", status: :created))
    Delivery.create!(attrs.merge(reference: "TV-FAILED", status: :failed))

    get api_v1_deliveries_url, params: { status: "failed" }

    assert_response :success
    body = JSON.parse(response.body)
    refs = body["items"].pluck("reference")
    assert_equal [ "TV-FAILED" ], refs
    assert_equal 1, body["total"]
  end

  test "index paginates a status filter" do
    3.times do |index|
      Delivery.create!(attrs.merge(reference: "TV-OK-#{index}", status: :created))
    end
    2.times do |index|
      Delivery.create!(attrs.merge(reference: "TV-FAIL-#{index}", status: :failed))
    end

    get api_v1_deliveries_url, params: { status: "failed", page: 1, per_page: 1 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["items"].length
    assert_equal 2, body["total"]
    assert_equal 2, body["total_pages"]
    assert_equal "failed", body["items"].first["status"]
  end

  test "index sorts by reference ascending then paginates" do
    Delivery.create!(attrs.merge(reference: "TV-C"))
    Delivery.create!(attrs.merge(reference: "TV-A"))
    Delivery.create!(attrs.merge(reference: "TV-B"))

    get api_v1_deliveries_url, params: { sort: "reference", dir: "asc", per_page: 2 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal %w[TV-A TV-B], body["items"].pluck("reference")
    assert_equal 3, body["total"]
    assert_equal 2, body["total_pages"]
  end

  test "index ignores invalid sort and dir" do
    older = Delivery.create!(attrs.merge(reference: "TV-OLD", created_at: 1.day.ago))
    newer = Delivery.create!(attrs.merge(reference: "TV-NEW"))

    get api_v1_deliveries_url, params: { sort: "nope", dir: "sideways" }

    assert_response :success
    refs = JSON.parse(response.body)["items"].pluck("reference")
    assert_equal [ newer.reference, older.reference ], refs
  end

  test "index corrects invalid page and per_page" do
    Delivery.create!(attrs)

    get api_v1_deliveries_url, params: { page: -3, per_page: 0 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["page"]
    assert_equal 20, body["per_page"]
  end

  test "index rejects an unknown status" do
    get api_v1_deliveries_url, params: { status: "pending" }

    assert_response :bad_request
    assert_includes JSON.parse(response.body)["errors"], "Status is not included in the list"
  end

  test "create persists a delivery" do
    assert_difference("Delivery.count", 1) do
      post api_v1_deliveries_url, params: { delivery: attrs }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "TV-300001", body["reference"]
    assert_equal "created", body["status"]
    assert_equal @address.id, body["address_id"]
    assert_equal known_address, body["address"]
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

  test "create rejects an unknown address_id" do
    assert_no_difference("Delivery.count") do
      post api_v1_deliveries_url,
        params: { delivery: attrs.merge(reference: "TV-UNKNOWN", address_id: -1) },
        as: :json
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Address must exist"
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
