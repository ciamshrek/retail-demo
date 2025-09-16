import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, Menu, X, User, LogIn, LogOut, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { useCartStore, useCartItemCount } from "~/stores/cartStore";
import toast from "react-hot-toast";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const navigate = useNavigate();

  const { isAuthenticated, user, logout } = useAuthStore();
  const { items, isOpen, toggleCart, removeItem, updateQuantity } = useCartStore();
  const cartItemCount = useCartItemCount();

  const trpc = useTRPC();
  const searchSuggestions = useQuery(
    trpc.getSearchSuggestions.queryOptions(
      { query: searchQuery, limit: 5 },
      { 
        enabled: searchQuery.length > 2,
        staleTime: 1000 * 60 * 5 // 5 minutes
      }
    )
  );

  const categories = useQuery(trpc.getCategories.queryOptions());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/products", search: { search: searchQuery } });
      setShowSearchSuggestions(false);
      setSearchQuery("");
    }
  };

  const handleSuggestionClick = (slug: string) => {
    navigate({ to: `/products/${slug}` });
    setShowSearchSuggestions(false);
    setSearchQuery("");
  };

  const handleLogin = () => {
    // In a real app, this would redirect to Auth0 login
    toast("Redirecting to login...", { icon: "🔐" });
    // window.location.href = `https://${AUTH0_DOMAIN}/authorize?...`;
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-xl text-gray-900">Haven</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/products" 
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              All Products
            </Link>
            {categories.data?.slice(0, 4).map((category) => (
              <Link
                key={category.id}
                to="/products"
                search={{ categoryId: category.id }}
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:block relative">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Search Suggestions */}
              {showSearchSuggestions && searchQuery.length > 2 && searchSuggestions.data && searchSuggestions.data.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {searchSuggestions.data.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSuggestionClick(product.slug)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                    >
                      {product.images[0] && (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">${product.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Mobile search button */}
            <button className="md:hidden p-2 text-gray-700 hover:text-gray-900">
              <Search className="w-5 h-5" />
            </button>

            {/* Cart */}
            <div className="relative">
              <button 
                onClick={toggleCart}
                className="p-2 text-gray-700 hover:text-gray-900 relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* Cart Dropdown */}
              {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Shopping Cart</h3>
                      <button
                        onClick={toggleCart}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Your cart is empty</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  removeItem(item.productId);
                                  toast.success("Item removed from cart");
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold text-gray-900">Total:</span>
                            <span className="font-bold text-gray-900">
                              ${items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Link to="/cart" className="block">
                              <button
                                onClick={toggleCart}
                                className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                              >
                                View Cart
                              </button>
                            </Link>
                            <Link to="/checkout" className="block">
                              <button
                                onClick={toggleCart}
                                className="w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                              >
                                Checkout
                              </button>
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="hidden md:block text-sm text-gray-700">
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-700 hover:text-gray-900"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-700 hover:text-gray-900"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/products" 
                className="text-gray-700 hover:text-gray-900 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                All Products
              </Link>
              {categories.data?.map((category) => (
                <Link
                  key={category.id}
                  to="/products"
                  search={{ categoryId: category.id }}
                  className="text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
