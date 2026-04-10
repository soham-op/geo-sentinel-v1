import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Types — capture every known field variant from Serper Maps
// ─────────────────────────────────────────────────────────────────────────────
type SerperPlace = {
  // Identity
  title?: string;
  address?: string;
  // Rating
  rating?: number;
  // Review count — Serper has used multiple keys across versions
  ratingCount?: number;       // most common
  reviewsCount?: number;      // alternative spelling
  reviews?: number;           // older versions
  userRatingsTotal?: number;  // Google Places style
  // Category — Serper uses "type" (confirmed) or "category"
  type?: string;
  types?: string[];           // array version
  category?: string;          // older fallback
  // Contact
  website?: string;
  phoneNumber?: string;       // confirmed field name from Serper Maps
  phone?: string;             // fallback
  // Additional data
  description?: string;
  priceLevel?: string;
  openingHours?: Record<string, string>;
  bookingLinks?: string[];
  // Meta
  thumbnailUrl?: string;
  cid?: string;
  fid?: string;
  placeId?: string;
  position?: number;
};

type SerperResponse = {
  places?: SerperPlace[];
};

type IssueImpact = "high" | "medium" | "low";

type Issue = {
  id: string;
  title: string;
  description: string;
  impact: IssueImpact;
  category: string;
  fix: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Extract review count — try every known field name
// ─────────────────────────────────────────────────────────────────────────────
function extractReviewCount(place: SerperPlace): number | null {
  // Check each known key; log which one matched so we can debug future regressions
  const candidates: Array<[string, number | undefined]> = [
    ["ratingCount",      place.ratingCount],
    ["reviewsCount",     place.reviewsCount],
    ["reviews",          place.reviews],
    ["userRatingsTotal", place.userRatingsTotal],
  ];
  for (const [key, val] of candidates) {
    if (val != null) {
      console.log(`[audit] reviewCount source: ${key} = ${val}`);
      return Number(val);
    }
  }
  console.log("[audit] reviewCount: no matching field found");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract phone — Serper Maps field is phoneNumber
// ─────────────────────────────────────────────────────────────────────────────
function extractPhone(place: SerperPlace): string | null {
  return place.phoneNumber ?? place.phone ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract category — confirmed Serper field is "type" / "types[0]"
// ─────────────────────────────────────────────────────────────────────────────
function extractCategory(place: SerperPlace): string | null {
  return place.type ?? place.types?.[0] ?? place.category ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────
type ScoreBreakdown = {
  total: number;
  reviewScore: number;
  ratingScore: number;
  websiteScore: number;
  foundScore: number;
};

function calcScore(
  place: SerperPlace | undefined,
  reviewCount: number | null,
): ScoreBreakdown {
  if (!place) {
    return { total: 20, reviewScore: 0, ratingScore: 0, websiteScore: 0, foundScore: 20 };
  }

  const reviews = reviewCount ?? 0;
  const rating  = place.rating ?? 0;
  const hasWeb  = Boolean(place.website);

  // Reviews (max 40 pts)
  let reviewScore: number;
  if      (reviews >= 100) reviewScore = 40;
  else if (reviews >= 50)  reviewScore = 30;
  else if (reviews >= 20)  reviewScore = 18;
  else if (reviews >= 5)   reviewScore = 8;
  else                     reviewScore = 0;

  // Rating (max 35 pts)
  let ratingScore: number;
  if      (rating >= 4.5) ratingScore = 35;
  else if (rating >= 4.0) ratingScore = 25;
  else if (rating >= 3.5) ratingScore = 14;
  else if (rating >= 3.0) ratingScore = 6;
  else                    ratingScore = 0;

  // Website (15 pts)
  const websiteScore = hasWeb ? 15 : 0;

  // Found on Google Maps (10 pts base)
  const foundScore = 10;

  const total = Math.min(foundScore + reviewScore + ratingScore + websiteScore, 100);
  return { total, reviewScore, ratingScore, websiteScore, foundScore };
}

// ─────────────────────────────────────────────────────────────────────────────
// Issues Engine — 100% factual, zero randomisation
// Each issue is only added when the real data actually triggers it
// ─────────────────────────────────────────────────────────────────────────────
function buildIssues(
  place: SerperPlace | undefined,
  reviewCount: number | null,
  phone: string | null,
  category: string | null,
): Issue[] {
  const issues: Issue[] = [];

  // ── Business not in Google Maps at all ────────────────────────────────────
  if (!place) {
    issues.push({
      id: "not-found",
      title: "Business Not Found on Google Maps",
      description:
        "Your business could not be found in Google Maps results. Customers searching locally cannot find you.",
      impact: "high",
      category: "Visibility",
      fix: "Claim and verify your Google Business Profile at business.google.com immediately.",
    });
    issues.push({
      id: "gmb-missing",
      title: "No Google Business Profile",
      description:
        "Without a verified GBP listing, you are invisible to the 46% of Google searches with local intent.",
      impact: "high",
      category: "Local SEO",
      fix: "Create a complete GBP listing with photos, hours, services, and a description.",
    });
    issues.push({
      id: "nap-unknown",
      title: "NAP Data Cannot Be Verified",
      description:
        "Without a Maps listing, your Name, Address, and Phone number cannot be verified for consistency.",
      impact: "medium",
      category: "Citations",
      fix: "Establish your canonical business data and submit it to all major directories.",
    });
    return issues;
  }

  const reviews = reviewCount ?? 0;
  const rating  = place.rating ?? 0;
  const hasWeb  = Boolean(place.website);

  // ── Review velocity ───────────────────────────────────────────────────────
  if (reviews < 20) {
    issues.push({
      id: "review-critical",
      title: "Critically Low Review Count",
      description: `You have only ${reviews} review${reviews === 1 ? "" : "s"}. Google's local algorithm heavily favours businesses with 100+ reviews. You are likely invisible in competitive searches.`,
      impact: "high",
      category: "Reputation",
      fix: "Send a review request link to every customer this week via WhatsApp or SMS.",
    });
  } else if (reviews < 50) {
    issues.push({
      id: "review-low",
      title: "Increase Review Velocity",
      description: `With ${reviews} reviews, you are below the local benchmark of 50+. Competitors with more reviews consistently outrank you in the Local Pack.`,
      impact: "high",
      category: "Reputation",
      fix: "Automate post-visit review requests. Aim for 5 new reviews per week.",
    });
  } else if (reviews < 100) {
    issues.push({
      id: "review-moderate",
      title: "Grow Review Volume to 100+",
      description: `You have ${reviews} reviews, but top competitors likely have 100+. Closing this gap will improve your Local Pack position.`,
      impact: "medium",
      category: "Reputation",
      fix: "Place a QR code linking to your review page at your counter and on receipts.",
    });
  }

  // ── Rating quality ────────────────────────────────────────────────────────
  if (rating > 0 && rating < 3.5) {
    issues.push({
      id: "rating-critical",
      title: "Damaging Star Rating",
      description: `Your rating of ${rating}★ is critically low. Google suppresses businesses below 3.5★ in many searches.`,
      impact: "high",
      category: "Reputation",
      fix: "Respond to every negative review professionally. Invite satisfied customers to update their reviews.",
    });
  } else if (rating > 0 && rating < 4.0) {
    issues.push({
      id: "rating-low",
      title: "Below-Average Star Rating",
      description: `Your rating of ${rating}★ falls below the 4.0 threshold Google uses to surface top results. 57% of users avoid businesses rated below 4.0.`,
      impact: "high",
      category: "Reputation",
      fix: "Identify your most satisfied customers and ask them directly for a 5-star review.",
    });
  } else if (rating > 0 && rating < 4.5) {
    issues.push({
      id: "rating-medium",
      title: "Optimize Toward a 4.5★ Rating",
      description: `Your rating of ${rating}★ is good, but 4.5+ unlocks Google's "Highly Rated" badge, significantly increasing click-through rates.`,
      impact: "medium",
      category: "Reputation",
      fix: "Follow up with customers after each visit and gently ask for an honest review.",
    });
  }

  // ── Website presence ──────────────────────────────────────────────────────
  if (!hasWeb) {
    issues.push({
      id: "no-website",
      title: "No Website Linked to Google Listing",
      description:
        "Your Google Maps listing has no website URL. Listings with websites get 35% more clicks.",
      impact: "high",
      category: "Technical",
      fix: "Create a simple landing page and add its URL to your Google Business Profile.",
    });
  }

  // ── Phone number — ONLY if phoneNumber field is actually empty ─────────────
  if (!phone) {
    issues.push({
      id: "no-phone",
      title: "Phone Number Missing from Google Listing",
      description:
        "No phone number was found on your Google Maps listing. Customers cannot call you directly, and inconsistent NAP data hurts your local rankings.",
      impact: "medium",
      category: "Citations",
      fix: "Add your primary phone number to your Google Business Profile and ensure it matches your website and directories.",
    });
  }

  // ── Category — ONLY if type/category field is actually empty ───────────────
  if (!category) {
    issues.push({
      id: "no-category",
      title: "Business Category Missing or Incorrect",
      description:
        "No business category was found on your Google listing. Category is one of the most critical local ranking factors — Google uses it to decide which searches to show you in.",
      impact: "medium",
      category: "Local SEO",
      fix: "Log in to Google Business Profile and set the most specific, accurate primary category for your business.",
    });
  }

  // ── Always-applicable structural issues (factual, not random) ────────────
  issues.push({
    id: "nap-consistency",
    title: "NAP Consistency Across Directories",
    description:
      "Your business Name, Address, and Phone must be identical across Justdial, Sulekha, IndiaMART, and other directories. Inconsistencies dilute trust signals and hurt ranking.",
    impact: "medium",
    category: "Citations",
    fix: "Audit and standardize your NAP data across the top 20 Indian local directories.",
  });

  issues.push({
    id: "schema-markup",
    title: "Missing LocalBusiness Schema Markup",
    description:
      "Your website likely lacks JSON-LD structured data telling Google exactly who you are and where you are. This reduces eligibility for rich results.",
    impact: "medium",
    category: "SEO",
    fix: "Add LocalBusiness JSON-LD schema to your homepage and contact page.",
  });

  // Cap at 5 total issues
  return issues.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/audit
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullAddress } = body as { fullAddress?: string };

    if (!fullAddress?.trim()) {
      return NextResponse.json({ error: "fullAddress is required" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "SERPER_API_KEY not configured" }, { status: 500 });
    }

    // ── 1. Call Serper Maps ─────────────────────────────────────────────────
    const serperRes = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: fullAddress, gl: "in", hl: "en" }),
    });

    if (!serperRes.ok) {
      const txt = await serperRes.text();
      console.error("[audit] Serper API error:", txt);
      return NextResponse.json({ error: "Serper API request failed", detail: txt }, { status: 502 });
    }

    const serperData = (await serperRes.json()) as SerperResponse;

    // ── 2. Read the raw place object as a plain Record so TypeScript
    //       type coercion cannot accidentally hide fields ─────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: Record<string, any> = (serperData.places?.[0] ?? {}) as Record<string, any>;
    const placeFound = Object.keys(raw).length > 0;

    // Dump every key-value in the dev console for full visibility
    console.log("[audit] Serper raw keys →", Object.keys(raw));
    console.log("[audit] Serper raw result →\n", JSON.stringify(raw, null, 2));

    // ── 3. Extract each field with explicit fallback chains ─────────────────
    const rating: number | null =
      typeof raw.rating === "number" ? raw.rating : null;

    // reviewCount: try every known key name, coerce to number
    const rawReviewCount =
      raw.reviews ??        // Serper often uses 'reviews' for the true full count
      raw.ratingCount ??    // alternative used by some Serper endpoints
      raw.reviewsCount ??   // snake_case variant
      raw.userRatingsTotal ?? // Google Places passthrough
      null;
    const reviewCount: number | null =
      rawReviewCount != null ? Number(rawReviewCount) : null;

    // phoneNumber: Serper confirmed field; also check legacy "phone"
    const rawPhone: string | undefined =
      (typeof raw.phoneNumber === "string" && raw.phoneNumber.trim() !== "")
        ? raw.phoneNumber.trim()
        : (typeof raw.phone === "string" && raw.phone.trim() !== "")
          ? raw.phone.trim()
          : undefined;
    const phone: string | null = rawPhone ?? null;

    // category: Serper confirmed field is "type"; also check "types[0]" and "category"
    const rawCategory: string | undefined =
      (typeof raw.type === "string" && raw.type.trim() !== "")
        ? raw.type.trim()
        : (Array.isArray(raw.types) && typeof raw.types[0] === "string")
          ? raw.types[0]
          : (typeof raw.category === "string" && raw.category.trim() !== "")
            ? raw.category.trim()
            : undefined;
    const category: string | null = rawCategory ?? null;

    const hasWebsite    = typeof raw.website === "string" && raw.website.trim() !== "";
    const businessName  = typeof raw.title   === "string" ? raw.title   : fullAddress;
    const address       = typeof raw.address === "string" ? raw.address : fullAddress;

    // Parse city: second-to-last comma segment in the address string
    const addrParts = address.split(",");
    const city = addrParts.length >= 2
      ? (addrParts[addrParts.length - 2]?.trim() ?? "")
      : "";

    // Final extraction summary log — this is the source of truth
    console.log("[audit] Extracted →", {
      businessName,
      rating,
      reviewCount,   // <-- should now show real value if ratingCount exists
      phone,         // <-- should now show real value if phoneNumber exists
      category,
      hasWebsite,
      placeFound,
    });

    // ── 4. Score ────────────────────────────────────────────────────────────
    const firstPlace: SerperPlace | undefined = placeFound ? (raw as SerperPlace) : undefined;
    const breakdown = calcScore(firstPlace, reviewCount);

    // ── 5. Data-driven issues (zero randomisation) ──────────────────────────
    const issues = buildIssues(firstPlace, reviewCount, phone, category);

    // ── 6. Return payload ───────────────────────────────────────────────────
    return NextResponse.json(
      {
        seo_score:       breakdown.total,
        business_name:   businessName,
        city,
        full_address:    fullAddress,
        rating,
        review_count:    reviewCount,
        category,
        phone,
        has_website:     hasWebsite,
        issues:          JSON.stringify(issues),
        score_breakdown: breakdown,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error("[audit] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

