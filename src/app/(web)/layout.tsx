import { Header, Footer } from "@/components/web/SiteChrome";
import { UserActionTracker } from "@/components/web/UserActionTracker";

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <UserActionTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
