Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :todos
      resources :addresses, only: %i[index create update destroy]
      resources :deliveries, only: %i[index create update]
    end
  end
end
