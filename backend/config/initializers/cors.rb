# Be sure to restart your server when you modify this file.

# Allow the Vite dev server (and optional LAN hosts) to call the API.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")

    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      max_age: 86400
  end
end
