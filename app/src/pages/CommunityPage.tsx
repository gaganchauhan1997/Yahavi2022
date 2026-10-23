import { Link } from 'react-router-dom';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
export default function CommunityPage() {
  useDocumentMeta({ title: 'HackKnow Community & Free Resources', description: 'Explore free Excel workbooks and connect with HackKnow. No membership, review or social follow is required to download.' });
  return <div className="max-w-4xl mx-auto px-4 pt-28 lg:pt-36 pb-20">
    <p className="font-mono text-sm uppercase mb-3">Learn · Build · Share</p>
    <h1 className="font-display font-bold text-4xl lg:text-5xl mb-6">Useful resources, open to everyone.</h1>
    <p className="text-lg text-hack-black/75 mb-8">Start with a free Excel workbook for finance, career or business planning. No account, email address, review, social follow or payment is required.</p>
    <Link to="/free-excel-templates/" className="inline-block bg-hack-yellow border-2 border-hack-black rounded-xl px-6 py-3 font-bold mb-10">Browse free Excel templates</Link>
    <h2 className="font-display font-bold text-2xl mb-4">Stay in touch</h2>
    <p className="mb-5">Have feedback or a resource suggestion? Write to <a className="underline" href="mailto:team@hackknow.com">team@hackknow.com</a>.</p>
    <div className="flex flex-wrap gap-5"><a className="underline" href="https://www.linkedin.com/in/gagan-yahavi-hackknow/" target="_blank" rel="noopener noreferrer">Gagan on LinkedIn</a><a className="underline" href="https://www.instagram.com/i_kunalarious/" target="_blank" rel="noopener noreferrer">Gagan on Instagram</a></div>
  </div>;
}
