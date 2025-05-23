"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-white">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <div className="flex flex-col space-y-4 mt-8">
          <Link href="/" className="px-4 py-2 text-lg hover:bg-slate-100 rounded-md" onClick={() => setOpen(false)}>
            Trang chủ
          </Link>
          <Link href="#" className="px-4 py-2 text-lg hover:bg-slate-100 rounded-md" onClick={() => setOpen(false)}>
            Tuyển sinh
          </Link>
          <Link href="#" className="px-4 py-2 text-lg hover:bg-slate-100 rounded-md" onClick={() => setOpen(false)}>
            Ngành đào tạo
          </Link>
          <Link href="#" className="px-4 py-2 text-lg hover:bg-slate-100 rounded-md" onClick={() => setOpen(false)}>
            Tin tức
          </Link>
          <Link href="#" className="px-4 py-2 text-lg hover:bg-slate-100 rounded-md" onClick={() => setOpen(false)}>
            Liên hệ
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
