import Link from "next/link"
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#0A1172] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Trường Đại học Công nghệ Thông tin</h3>
            <div className="flex flex-col space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>Khu phố 6, P.Linh Trung, Tp.Thủ Đức, Tp.Hồ Chí Minh</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <span>(028) 372 52002</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <span>info@uit.edu.vn</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-blue-200 transition-colors">
                  Trang chủ UIT
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-200 transition-colors">
                  Đào tạo đại học
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-200 transition-colors">
                  Đào tạo sau đại học
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-200 transition-colors">
                  Nghiên cứu khoa học
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-blue-200 transition-colors">
                  Hợp tác đối ngoại
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Kết nối với chúng tôi</h3>
            <div className="flex space-x-4 mb-4">
              <Link href="#" className="hover:text-blue-200 transition-colors">
                <Facebook className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="hover:text-blue-200 transition-colors">
                <Twitter className="h-6 w-6" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="hover:text-blue-200 transition-colors">
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </Link>
            </div>
            <p>Đăng ký nhận thông tin tuyển sinh mới nhất</p>
            <div className="mt-2 flex">
              <input
                type="email"
                placeholder="Email của bạn"
                className="px-3 py-2 text-black bg-white rounded-l-md w-full focus:outline-none"
              />
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r-md transition-colors">Gửi</button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-blue-800 text-center">
          <p>
            &copy; {new Date().getFullYear()} Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM. Tất cả quyền được bảo
            lưu.
          </p>
        </div>
      </div>
    </footer>
  )
}
