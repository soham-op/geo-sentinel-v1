export type Problem = {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  fix: string;
};

export const PROBLEM_POOL: Problem[] = [
  {
    id: "p1",
    title: "Slow Website Response",
    description: "Your site loads too slowly, negatively impacting user experience and search engine rankings.",
    impact: "high",
    category: "Technical",
    fix: "Optimize images, leverage browser caching, and consider a CDN.",
  },
  {
    id: "p2",
    title: "Inconsistent NAP Data",
    description: "Name, Address, and Phone number are inconsistent across local directories.",
    impact: "high",
    category: "Citations",
    fix: "Audit and standardize local directory listings.",
  },
  {
    id: "p3",
    title: "Missing Schema Markup",
    description: "Crucial structured data for local business is missing from your web pages.",
    impact: "medium",
    category: "SEO",
    fix: "Implement LocalBusiness JSON-LD schema.",
  },
  {
    id: "p4",
    title: "Low Review Velocity",
    description: "You aren't receiving a steady stream of new reviews compared to competitors.",
    impact: "high",
    category: "Reputation",
    fix: "Implement an automated review request campaign.",
  },
  {
    id: "p5",
    title: "Unoptimized Images",
    description: "Images are serving in legacy formats without proper sizing or compression.",
    impact: "medium",
    category: "Technical",
    fix: "Convert images to WebP and ensure proper responsive attributes.",
  }
];

/** Pick `count` unique random problems from the pool */
export function pickProblems(count = 3): Problem[] {
  const shuffled = [...PROBLEM_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
