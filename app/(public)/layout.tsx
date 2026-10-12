import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// The chrome every public page shares. The admin area has its own
// layout and deliberately none of this.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {/* The skip link in the header targets this id. */}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
