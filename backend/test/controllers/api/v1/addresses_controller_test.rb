require "test_helper"

class Api::V1::AddressesControllerTest < ActionDispatch::IntegrationTest
  def attrs(overrides = {})
    {
      address: "25 Pitt St, Hurstville NSW",
      lat: -33.949285,
      long: 151.098093
    }.merge(overrides)
  end

  test "index returns addresses newest first" do
    older = Address.create!(attrs.merge(address: "Older street", created_at: 1.day.ago))
    newer = Address.create!(attrs.merge(address: "Newer street"))

    get api_v1_addresses_url

    assert_response :success
    body = JSON.parse(response.body)
    names = body["items"].pluck("address")
    assert_equal [ newer.address, older.address ], names
    assert_equal 1, body["page"]
    assert_equal 20, body["per_page"]
    assert_equal 2, body["total"]
    assert_equal 1, body["total_pages"]
  end

  test "index paginates addresses" do
    21.times do |index|
      Address.create!(attrs.merge(address: "Street #{index}", created_at: index.minutes.ago))
    end

    get api_v1_addresses_url, params: { page: 2, per_page: 20 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["items"].length
    assert_equal 2, body["page"]
    assert_equal 21, body["total"]
    assert_equal 2, body["total_pages"]
  end

  test "index corrects invalid page and per_page" do
    Address.create!(attrs)

    get api_v1_addresses_url, params: { page: 0, per_page: 1000 }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal 1, body["page"]
    assert_equal 100, body["per_page"]
  end

  test "create persists an address" do
    assert_difference("Address.count", 1) do
      post api_v1_addresses_url, params: { address: attrs }, as: :json
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "25 Pitt St, Hurstville NSW", body["address"]
    assert_equal "-33.949285", BigDecimal(body["lat"].to_s).to_s("F")
  end

  test "create rejects a duplicate address" do
    Address.create!(attrs)

    assert_no_difference("Address.count") do
      post api_v1_addresses_url, params: { address: attrs }, as: :json
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"], "Address has already been taken"
  end

  test "create rejects a blank address" do
    assert_no_difference("Address.count") do
      post api_v1_addresses_url, params: { address: attrs.merge(address: "") }, as: :json
    end

    assert_response :unprocessable_content
  end

  test "update changes address and coordinates" do
    record = Address.create!(attrs)

    patch api_v1_address_url(record),
      params: { address: { address: "191 Pitt St, Parramatta NSW", lat: -33.811836, long: 151.006657 } },
      as: :json

    assert_response :success
    record.reload
    assert_equal "191 Pitt St, Parramatta NSW", record.address
    assert_equal BigDecimal("-33.811836"), record.lat
  end

  test "destroy removes an unused address" do
    record = Address.create!(attrs)

    assert_difference("Address.count", -1) do
      delete api_v1_address_url(record)
    end

    assert_response :no_content
  end

  test "destroy rejects an address used by a delivery" do
    record = Address.create!(attrs)
    Delivery.create!(
      reference: "TV-300001",
      customer_name: "Coastal Electronics",
      address_id: record.id,
      time_window_start: "08:00",
      time_window_end: "10:00"
    )

    assert_no_difference("Address.count") do
      assert_no_difference("Delivery.count") do
        delete api_v1_address_url(record)
      end
    end

    assert_response :unprocessable_content
    assert_includes JSON.parse(response.body)["errors"],
      "Cannot delete record because dependent deliveries exist"
    assert Address.exists?(record.id)
    assert Delivery.exists?("TV-300001")
  end
end

