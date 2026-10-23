import { Link } from 'react-router-dom';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
export default function TestimonialsPage() {
  useDocumentMeta({ title: 'Customer Feedback | HackKnow', description: 'Share feedback about HackKnow resources. Product reviews are shown on the relevant product page.' });
  return <div className="max-w-4xl mx-auto px-4 pt-28 lg:pt-36 pb-20">
    <h1 className="font-display font-bold text-4xl mb-6">Customer feedback</h1>
    <p className="text-lg text-hack-black/75 mb-6">Product reviews belong alongside the product they describe. Visit a product page to read available feedback or leave your own review.</p>
    <p className="mb-8">For help with a file or to share a suggestion, email <a className="underline" href="mailto:team@hackknow.com">team@hackknow.com</a>.</p>
    <div className="flex flex-wrap gap-4"><Link className="bg-hack-yellow border-2 border-hack-black rounded-xl px-6 py-3 font-bold" to="/shop/">Browse products</Link><Link className="border-2 border-hack-black rounded-xl px-6 py-3 font-bold" to="/free-excel-templates/">Try a free Excel workbook</Link></div>
  </div>;
}
