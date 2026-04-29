import { useEffect, useState, useCallback } from "react";
import { Star, Loader2, Send, BadgeCheck } from "lucide-react";
import { WP_REST_BASE } from "@/lib/api-base";
import { getAuthToken, isAuthenticated } from "@/lib/auth";
import { Link } from "react-router-dom";

interface Review {
  id: number;
  product_id: number;
  author: string;
  avatar?: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
  verified: boolean;
}

interface ReviewsResponse {
  reviews: Review[];
  count: number;
  average_rating: number;
  is_free: boolean;
}

interface Props {
  productId: string;
  fallbackRating?: number;
  fallbackCount?: number;
}

export default function ReviewsBlock({ productId, fallbackRating, fallbackCount }: Props) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitErr, setSubmitErr] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${WP_REST_BASE}/products/${productId}/reviews`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as ReviewsResponse;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void fetchReviews(); }, [fetchReviews]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMsg("");
    setSubmitErr("");
    if (text.trim().length < 5) {
      setSubmitErr("Review must be at least 5 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${WP_REST_BASE}/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken() ?? ""}`,
        },
        body: JSON.stringify({ rating, text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitErr((j as { message?: string }).message || "Could not submit review");
        return;
      }
      setSubmitMsg(
        (j as { pending?: boolean }).pending
          ? "Thanks! Your review is queued for moderation."
          : "Thanks! Your review is now live."
      );
      setText("");
      setRating(5);
      void fetchReviews();
    } catch {
      setSubmitErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const avg = data?.average_rating ?? fallbackRating ?? 0;
  const count = data?.count ?? fallbackCount ?? 0;
  const isFree = data?.is_free ?? false;
  const authed = isAuthenticated();

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-hack-black/5">
      {/* Summary */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-center">
          <p className="font-display font-bold text-4xl">{avg ? avg.toFixed(1) : "—"}</p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(avg) ? "fill-hack-yellow text-hack-yellow" : "text-hack-black/20"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-hack-black/50 mt-1">
            {count} review{count === 1 ? "" : "s"}
          </p>
        </div>
        {isFree && (
          <span className="ml-auto text-xs font-mono uppercase tracking-wider px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300">
            Free product · open reviews
          </span>
        )}
      </div>

      {/* List */}
      {loading && (
        <div className="text-center py-8 text-hack-black/50 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…
        </div>
      )}
      {error && !loading && (
        <p className="text-sm text-red-600 mb-4">Could not load reviews: {error}</p>
      )}
      {!loading && data && data.reviews.length === 0 && (
        <p className="text-sm text-hack-black/60 mb-4">No reviews yet. Be the first to share!</p>
      )}
      {!loading && data && data.reviews.length > 0 && (
        <div className="space-y-4 mb-6">
          {data.reviews.map((r) => (
            <div key={r.id} className="border-t border-hack-black/5 pt-4">
              <div className="flex items-center gap-3 mb-2">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="w-8 h-8 rounded-full" loading="lazy" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-hack-black/10 flex items-center justify-center text-xs font-bold">
                    {r.author.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {r.author}
                    {r.verified && (
                      <span title="Verified buyer" className="inline-flex">
                        <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-hack-black/50">{new Date(r.date).toLocaleDateString()}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-hack-yellow text-hack-yellow" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-hack-black/70 whitespace-pre-wrap">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <div className="border-t border-hack-black/10 pt-6">
        <h4 className="font-display font-bold text-lg mb-2">Write a review</h4>
        {!authed ? (
          <p className="text-sm text-hack-black/60">
            Please <Link to="/login" className="underline font-medium">sign in</Link> to write a review.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-hack-black/70">Your rating:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className="p-1"
                >
                  <Star
                    className={`w-5 h-5 ${
                      n <= rating ? "fill-hack-yellow text-hack-yellow" : "text-hack-black/20"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={
                isFree
                  ? "Share your experience with this free template…"
                  : "Tell other buyers what you thought…"
              }
              className="w-full rounded-xl border border-hack-black/15 px-4 py-3 text-sm focus:outline-none focus:border-hack-black"
              required
              minLength={5}
              maxLength={2000}
            />
            {submitErr && <p className="text-sm text-red-600">{submitErr}</p>}
            {submitMsg && <p className="text-sm text-green-700">{submitMsg}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-hack-black text-hack-white rounded-full text-sm font-bold disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            {!isFree && (
              <p className="text-xs text-hack-black/50">
                One review per purchased product. Your purchase will be verified automatically.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
