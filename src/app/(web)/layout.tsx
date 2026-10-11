import { Header, Footer } from "@/components/web/SiteChrome";
import { UserActionTracker } from "@/components/web/UserActionTracker";
import { FloatingContact } from "@/components/web/FloatingContact";
import { ChatWidget } from "@/components/web/ChatWidget";
import { getSettings } from "@/lib/settings";

export default async function WebLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="min-h-screen flex flex-col">
      <UserActionTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingContact phone={settings.contactPhone || settings.topNoticePhone || ""} />
      <ChatWidget />
    </div>
  );
}
