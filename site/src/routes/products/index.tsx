import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { ProductCard } from "~/components/ProductCard";
import { useState } from "react";
import { Filter, Grid, List, ChevronDown, X } from "lucide-react";

const searchSchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  colors: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  page: z.number().min(1).default(1),
  sortBy: z.enum(["newest", "price-asc", "price-desc", "name"]).default("newest")
});

export const Route = createFileRoute("/products/")({
  component: ProductsPage,
  validateSearch: searchSchema
});

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const trpc = useTRPC();
  const products = useQuery(trpc.getProducts.queryOptions({
    ...search,
    limit: 12
  }));
  const categories = useQuery(trpc.getCategories.queryOptions());

  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({
      search: { ...search, ...updates, page: 1 }
    });
  };

  const clearFilters = () => {
    navigate({
      search: { page: 1, sortBy: "newest" }
    });
  };

  const selectedCategory = categories.data?.find(c => c.id === search.categoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedCategory ? selectedCategory.name : search.search ? `Search: "${search.search}"` : 'All Products'}
              </h1>
              <p className="text-gray-600 mt-2">
                {products.data ? `${products.data.total} products found` : 'Loading products...'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              {/* View Mode Toggle */}
              <div className="flex border border-gray-200 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={search.sortBy}
                onChange={(e) => updateSearch({ sortBy: e.target.value as any })}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name</option>
              </select>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                {(search.categoryId || search.minPrice || search.maxPrice || search.colors?.length || search.materials?.length) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => updateSearch({ categoryId: undefined })}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                      !search.categoryId ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.data?.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => updateSearch({ categoryId: category.id })}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                        search.categoryId === category.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      {category.name}
                      <span className="text-gray-500 ml-2">({category._count.products})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={search.minPrice || ''}
                    onChange={(e) => updateSearch({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={search.maxPrice || ''}
                    onChange={(e) => updateSearch({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Quick Price Filters */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSearch({ minPrice: undefined, maxPrice: 500 })}
                    className="text-sm border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                  >
                    Under $500
                  </button>
                  <button
                    onClick={() => updateSearch({ minPrice: 500, maxPrice: 1000 })}
                    className="text-sm border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                  >
                    $500 - $1000
                  </button>
                  <button
                    onClick={() => updateSearch({ minPrice: 1000, maxPrice: 2000 })}
                    className="text-sm border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                  >
                    $1000 - $2000
                  </button>
                  <button
                    onClick={() => updateSearch({ minPrice: 2000, maxPrice: undefined })}
                    className="text-sm border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                  >
                    Over $2000
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {products.data && products.data.products.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" 
                  : "space-y-6"
                }>
                  {products.data.products.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      className={viewMode === 'list' ? 'flex' : ''}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {products.data.pages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-12">
                    <button
                      onClick={() => updateSearch({ page: Math.max(1, search.page - 1) })}
                      disabled={search.page === 1}
                      className="px-4 py-2 border border-gray-200 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {[...Array(Math.min(5, products.data.pages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => updateSearch({ page })}
                          className={`px-4 py-2 rounded-md text-sm ${
                            search.page === page
                              ? 'bg-black text-white'
                              : 'border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => updateSearch({ page: Math.min(products.data.pages, search.page + 1) })}
                      disabled={search.page === products.data.pages}
                      className="px-4 py-2 border border-gray-200 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : products.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-6 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found matching your criteria.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
