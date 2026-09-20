module Paginatable
  extend ActiveSupport::Concern

  DEFAULT_PER_PAGE = 20
  MAX_PER_PAGE = 100

  private

  def paginated(scope)
    page = params[:page].to_i
    page = 1 if page < 1

    per_page = params[:per_page].to_i
    per_page = DEFAULT_PER_PAGE if per_page <= 0
    per_page = MAX_PER_PAGE if per_page > MAX_PER_PAGE

    total = scope.except(:includes, :preload, :eager_load, :order, :select).count
    total_pages = (total.to_f / per_page).ceil

    {
      items: scope.offset((page - 1) * per_page).limit(per_page),
      page: page,
      per_page: per_page,
      total: total,
      total_pages: total_pages
    }
  end
end
