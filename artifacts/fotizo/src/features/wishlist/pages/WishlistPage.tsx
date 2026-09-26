import { PageLayout } from "@/components/layout/PageLayout";
import { WishlistItems } from "../components/WishlistItems";
export default function WishlistPage() {
  return (
    <PageLayout mainClassName="pt-20">
      <div className="container-app py-10">
        <h1 className="heading-page mb-3">My Wishlist</h1>
        <WishlistItems />
      </div>
    </PageLayout>
  );
}
