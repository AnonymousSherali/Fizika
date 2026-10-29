from rest_framework.pagination import PageNumberPagination


class Pagination(PageNumberPagination):
    """?page=1&page_size=20 → {count, next, previous, results} (TZ 8.1)."""

    page_size_query_param = "page_size"
    max_page_size = 100
