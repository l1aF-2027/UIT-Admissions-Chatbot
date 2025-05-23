import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

export function NewsSection() {
  const news = [
    {
      id: 1,
      title: "Thông báo tuyển sinh đại học chính quy năm 2023",
      description:
        "Trường Đại học Công nghệ Thông tin thông báo tuyển sinh đại học chính quy năm 2023 với nhiều phương thức xét tuyển khác nhau.",
      date: "15/03/2023",
      category: "Tuyển sinh",
    },
    {
      id: 2,
      title: "Điểm chuẩn trúng tuyển đại học chính quy năm 2022",
      description:
        "Trường Đại học Công nghệ Thông tin công bố điểm chuẩn trúng tuyển đại học chính quy năm 2022 theo các phương thức xét tuyển.",
      date: "10/08/2022",
      category: "Điểm chuẩn",
    },
    {
      id: 3,
      title: "Thông tin ngành Khoa học Máy tính",
      description:
        "Giới thiệu về ngành Khoa học Máy tính tại Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM.",
      date: "05/04/2023",
      category: "Ngành học",
    },
    {
      id: 4,
      title: "Thông tin ngành Trí tuệ Nhân tạo",
      description:
        "Giới thiệu về ngành Trí tuệ Nhân tạo tại Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM.",
      date: "05/04/2023",
      category: "Ngành học",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tin tức tuyển sinh</h2>
        <Link href="#" className="text-blue-600 hover:underline">
          Xem tất cả
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  {item.category}
                </Badge>
                <div className="flex items-center text-gray-500 text-sm">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  {item.date}
                </div>
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                {item.description}
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Link href="#" className="text-blue-600 hover:underline text-sm">
                Đọc thêm
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
