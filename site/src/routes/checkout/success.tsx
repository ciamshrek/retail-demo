import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle, Package, Mail, ArrowRight } from "lucide-react";

const searchSchema = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/checkout/success")({
  validateSearch: searchSchema,
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { session_id } = Route.useSearch();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for your purchase. Your order has been successfully processed.
          </p>

          {/* Order Details */}
          {session_id && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-gray-900 mb-2">Order Details</h2>
              <p className="text-sm text-gray-600">
                Order ID: <span className="font-mono font-medium">{session_id}</span>
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 mb-1">Confirmation Email</h3>
                <p className="text-sm text-gray-600">
                  We've sent a confirmation email with your order details and tracking information.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 mb-1">Shipping</h3>
                <p className="text-sm text-gray-600">
                  Your order will be shipped within 2-3 business days. You'll receive tracking details soon.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products">
              <button className="flex items-center justify-center space-x-2 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                <span>Continue Shopping</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            
            <Link to="/">
              <button className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                <span>Back to Home</span>
              </button>
            </Link>
          </div>

          {/* Support */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help with your order? 
              <a href="mailto:support@haven.com" className="text-black font-medium hover:underline ml-1">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
