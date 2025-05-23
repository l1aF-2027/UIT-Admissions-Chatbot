import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="relative bg-[#0A1172] text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-transparent opacity-90"></div>
      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Chào mừng đến với Cổng thông tin Tuyển sinh UIT
          </h1>
          <p className="text-lg md:text-xl mb-8">
            Khám phá các chương trình đào tạo chất lượng cao và cơ hội học tập
            tại Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-white/10 hover:text-white"
            >
              Tìm hiểu ngành học
            </Button>
            <Button
              size="lg"
              className="text-white bg-blue-600 hover:bg-white/10 hover:text-white"
            >
              Đăng ký tư vấn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
