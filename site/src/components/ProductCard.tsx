import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "~/stores/cartStore";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    images: Array<{
      url: string;
      altText: string | null;
    }>;
    category: {
      name: string;
    };
  };
  className?: string;
}

export function ProductCard({ product, className = "" }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const addItem = useCartStore((state) => state.addItem);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();
    
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image: product.images[0]?.url,
      slug: product.slug,
    });
    
    toast.success(`${product.name} added to cart`);
  };

  const discountPercentage = product.compareAtPrice 
    ? Math.round(((Number(product.compareAtPrice) - Number(product.price)) / Number(product.compareAtPrice)) * 100)
    : null;

  return (
    <div className={`group ${className}`}>
      <Link to={`/products/${product.slug}`}>
        <div 
          className="relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Image Container */}
          <div className="aspect-square overflow-hidden bg-gray-100">
            {product.images[0] && (
              <img
                src={product.images[0].url}
                alt={product.images[0].altText || product.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                } ${isHovered ? 'scale-105' : 'scale-100'}`}
              />
            )}
            
            {/* Discount Badge */}
            {discountPercentage && (
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                -{discountPercentage}%
              </div>
            )}

            {/* Wishlist Button */}
            <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white">
              <Heart className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" />
            </button>

            {/* Quick Add Button */}
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button 
                onClick={handleQuickAdd}
                className="w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Quick Add
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4">
            <div className="mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {product.category.name}
              </p>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
              {product.name}
            </h3>
            
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">
                ${Number(product.price).toFixed(2)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ${Number(product.compareAtPrice).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
