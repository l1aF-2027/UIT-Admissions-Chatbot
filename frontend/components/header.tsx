import Link from "next/link"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileMenu } from "@/components/mobile-menu"

export function Header() {
  return (
    <header className="bg-[#0A1172] text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">UIT</span>
              <span className="hidden md:inline-block text-xl font-bold">Tuyển Sinh</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="hover:text-blue-200 transition-colors">
              Trang chủ
            </Link>
            <Link href="#" className="hover:text-blue-200 transition-colors">
              Tuyển sinh
            </Link>
            <Link href="#" className="hover:text-blue-200 transition-colors">
              Ngành đào tạo
            </Link>
            <Link href="#" className="hover:text-blue-200 transition-colors">
              Tin tức
            </Link>
            <Link href="#" className="hover:text-blue-200 transition-colors">
              Liên hệ
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-white">
              <Search className="h-5 w-5" />
            </Button>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
