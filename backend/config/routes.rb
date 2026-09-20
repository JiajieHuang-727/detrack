Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :addresses, only: %i[index create update destroy]
      resources :deliveries, only: %i[index create update] do
        post :import, on: :collection
        resources :histories, only: :index, controller: "delivery_histories"
      end
    end
  end
end
