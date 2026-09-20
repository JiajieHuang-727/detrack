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
    names = JSON.parse(response.body).pluck("address")
    assert_equal [ newer.address, older.address ], names
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

  test "destroy removes the address" do
    record = Address.create!(attrs)

    assert_difference("Address.count", -1) do
      delete api_v1_address_url(record)
    end

    assert_response :no_content
  end
end
