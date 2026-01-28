import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container-app py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
                <Heart className="h-6 w-6 text-white" fill="white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Palbase</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              Helping pets find their forever homes by connecting shelters with loving families.
            </p>
          </div>

          {/* Find Pets */}
          <div>
            <h3 className="font-semibold text-gray-900">Find Pets</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/pets?species=dog" className="text-sm text-gray-600 hover:text-primary-600">
                  Dogs
                </Link>
              </li>
              <li>
                <Link href="/pets?species=cat" className="text-sm text-gray-600 hover:text-primary-600">
                  Cats
                </Link>
              </li>
              <li>
                <Link href="/pets?species=rabbit" className="text-sm text-gray-600 hover:text-primary-600">
                  Rabbits
                </Link>
              </li>
              <li>
                <Link href="/pets" className="text-sm text-gray-600 hover:text-primary-600">
                  All Pets
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-primary-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-primary-600">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-600 hover:text-primary-600">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-primary-600">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-primary-600">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Palbase. All rights reserved. Pet listings are sourced from partner shelters and rescues.
          </p>
        </div>
      </div>
    </footer>
  );
}
