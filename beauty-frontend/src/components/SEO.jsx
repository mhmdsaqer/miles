// src/components/SEO.jsx - النسخة النهائية الشاملة
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useLang } from "../context/LanguageContext";

const SEO = ({ 
  title, 
  description, 
  image, 
  url, 
  type = "website",
  productData = null,
  brandData = null
}) => {
  const { lang } = useLang();
  
  // ===== القيم الافتراضية للمتجر =====
  const siteName = "MILES Beauty Store";
  const defaultTitle = lang === "ar" 
    ? "MILES Beauty | وكيل حصري لـ 10 ماركات عالمية في فلسطين" 
    : "MILES Beauty | Exclusive Agent for 10 Global Brands in Palestine";
  const defaultDescription = lang === "ar"
    ? "اكتشفي أفضل منتجات العناية والجمال من أرقى الماركات العالمية. شحن آمن، دفع عند الاستلام، ومنتجات أصلية 100%."
    : "Discover the finest beauty and care products from top global brands. Secure shipping, cash on delivery, and 100% original products.";
  const defaultImage = "/assets/hero/og-image.jpg";
  const siteUrl = import.meta.env?.VITE_SITE_URL || "https://miles-beauty.com";
  
  // ===== معالجة القيم مع القيم الافتراضية =====
  const seo = {
    title: title ? `${title} | ${siteName}` : defaultTitle,
    description: description || defaultDescription,
    image: image 
      ? (image.startsWith("http") ? image : `${siteUrl}${image}`) 
      : `${siteUrl}${defaultImage}`,
    url: url 
      ? (url.startsWith("http") ? url : `${siteUrl}${url}`) 
      : siteUrl,
  };

  // ===== Structured Data للمنتجات (Product Schema) =====
  const productJsonLd = productData ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productData.name,
    "image": seo.image,
    "description": productData.description,
    "brand": {
      "@type": "Brand",
      "name": productData.brand
    },
    "offers": {
      "@type": "Offer",
      "url": seo.url,
      "priceCurrency": "ILS",
      "price": productData.price,
      "availability": productData.inStock 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": productData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": productData.rating,
      "reviewCount": productData.reviewCount || 0
    } : undefined
  } : null;

  // ===== Structured Data للبراندات (Brand Schema) =====
  const brandJsonLd = brandData ? {
    "@context": "https://schema.org",
    "@type": "Brand",
    "name": brandData.name,
    "url": brandData.url,
    "logo": brandData.logo,
    "image": brandData.logo,
    "sameAs": brandData.sameAs || [],
    "description": description || defaultDescription
  } : null;

  // ===== دالة توليد الـ JSON-LD النهائية =====
  const structuredData = useMemo(() => {
    if (productJsonLd && brandJsonLd) {
      return [productJsonLd, brandJsonLd];
    }
    return productJsonLd || brandJsonLd;
  }, [productJsonLd, brandJsonLd]);

  return (
    <Helmet>
      {/* ===== Basic Meta Tags ===== */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content="beauty, skincare, makeup, palestine, miles, cosmetics, babaria, nevertti, urban care, face facts, nascita, amazing shine, beauty formulas, cleanic, laser, damita" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={seo.url} />
      
      {/* ===== Language & Direction ===== */}
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <meta httpEquiv="content-language" content={lang === "ar" ? "ar-PS" : "en-US"} />
      
      {/* ===== Open Graph / Facebook ===== */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={lang === "ar" ? "ar_PS" : "en_US"} />
      <meta property="og:locale:alternate" content={lang === "ar" ? "en_US" : "ar_PS"} />
      
      {/* ===== Twitter Card ===== */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seo.url} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <meta name="twitter:site" content="@MilesBeautyPS" />
      
      {/* ===== Structured Data (JSON-LD) ===== */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
      
      {/* ===== Favicon & Theme ===== */}
      <link rel="icon" type="image/png" href="/favicon.png" />
      <meta name="theme-color" content="#1a1a1a" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </Helmet>
  );
};

export default SEO;