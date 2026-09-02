import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zarbill.com";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: base + "/free-invoice-generator", lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: base + "/login", lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: base + "/terms", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: base + "/privacy", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: base + "/refund-policy", lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
