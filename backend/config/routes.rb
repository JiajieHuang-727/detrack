Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :todos
      resources :addresses, only: %i[index create]
      resources :deliveries, only: %i[index create]
    end
  end
end
