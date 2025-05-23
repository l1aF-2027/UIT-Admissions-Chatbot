import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ChatInterface } from "@/components/chat-interface"
import { HeroSection } from "@/components/hero-section"
import { NewsSection } from "@/components/news-section"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-1">
              <NewsSection />
            </div>
            <div className="lg:col-span-1">
              <ChatInterface />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
