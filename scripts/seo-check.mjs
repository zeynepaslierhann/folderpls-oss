#!/usr/bin/env node

/**
 * SEO Check Script
 * Validates SEO-related files and configurations after build
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Routes that should be in sitemap
const expectedSitemapRoutes = [
  '',
  '/features',
  '/pricing',
  '/about',
  '/blog',
  '/contact',
  '/integrations',
  '/changelog',
  '/privacy-policy',
  '/terms-of-service',
];

let errors = [];
let warnings = [];

console.log('🔍 Running SEO checks...\n');

// Check 1: Verify sitemap.ts exists and has expected routes
try {
  const sitemapPath = join(rootDir, 'app', 'sitemap.ts');
  if (!existsSync(sitemapPath)) {
    errors.push('❌ app/sitemap.ts does not exist');
  } else {
    const sitemapContent = readFileSync(sitemapPath, 'utf-8');
    
    // Check if expected routes are mentioned in sitemap
    for (const route of expectedSitemapRoutes) {
      const routePattern = route === '' ? "''" : `'${route}'`;
      if (!sitemapContent.includes(routePattern) && !sitemapContent.includes(`"${route}"`)) {
        warnings.push(`⚠️  Route ${route} may be missing from sitemap.ts`);
      }
    }
    
    // lastModified must not be the build time: every deploy would mark every
    // URL as "changed" and search engines learn to ignore the sitemap's lastmod.
    if (sitemapContent.includes('VERCEL_BUILD_TIME') || /lastModified:\s*(buildTime|new Date\(\))/.test(sitemapContent)) {
      warnings.push('⚠️  sitemap.ts uses build time / now for lastModified - use real content dates or omit it');
    }
    
    console.log('✅ Sitemap check passed');
  }
} catch (error) {
  errors.push(`❌ Error reading sitemap.ts: ${error.message}`);
}

// Check 2: Verify robots.txt exists
try {
  const robotsPath = join(rootDir, 'public', 'robots.txt');
  if (!existsSync(robotsPath)) {
    errors.push('❌ public/robots.txt does not exist');
  } else {
    const robotsContent = readFileSync(robotsPath, 'utf-8');
    
    // Check for sitemap declaration
    if (!robotsContent.includes('Sitemap:')) {
      warnings.push('⚠️  robots.txt should include Sitemap declaration');
    }
    
    // Check for Crawl-delay (should not be present)
    if (robotsContent.includes('Crawl-delay:')) {
      warnings.push('⚠️  Crawl-delay in robots.txt is ignored by Google and can be removed');
    }
    
    console.log('✅ robots.txt check passed');
  }
} catch (error) {
  errors.push(`❌ Error reading robots.txt: ${error.message}`);
}

// Check 3: Verify layout.tsx has required structured data
try {
  const layoutPath = join(rootDir, 'app', 'layout.tsx');
  if (!existsSync(layoutPath)) {
    errors.push('❌ app/layout.tsx does not exist');
  } else {
    const layoutContent = readFileSync(layoutPath, 'utf-8');
    
    // Check for duplicate siteUrl
    const siteUrlMatches = layoutContent.match(/const siteUrl/g);
    if (siteUrlMatches && siteUrlMatches.length > 1) {
      errors.push('❌ Duplicate siteUrl declaration found in layout.tsx');
    }
    
    // Check for AggregateRating (should be removed if no real reviews)
    if (layoutContent.includes('aggregateRating') && layoutContent.includes('ratingValue')) {
      warnings.push('⚠️  AggregateRating found in layout.tsx - ensure you have real reviews or remove it');
    }
    
    // Check for WebSite schema
    if (!layoutContent.includes('WebSite') || !layoutContent.includes('SearchAction')) {
      warnings.push('⚠️  Consider adding WebSite + SearchAction schema for sitelinks search box');
    }
    
    console.log('✅ Layout.tsx check passed');
  }
} catch (error) {
  errors.push(`❌ Error reading layout.tsx: ${error.message}`);
}

// Check 4: Verify dashboard layout exists with noindex
try {
  const dashboardLayoutPath = join(rootDir, 'app', '(dashboard)', 'layout.tsx');
  
  if (!existsSync(dashboardLayoutPath)) {
    warnings.push('⚠️  app/(dashboard)/layout.tsx not found - consider adding noindex metadata');
  } else {
    const dashboardLayoutContent = readFileSync(dashboardLayoutPath, 'utf-8');
    if (!dashboardLayoutContent.includes('index: false')) {
      warnings.push('⚠️  app/(dashboard)/layout.tsx should have robots: { index: false }');
    } else {
      console.log('✅ Dashboard layout noindex check passed');
    }
  }
} catch (error) {
  warnings.push(`⚠️  Error checking dashboard layout: ${error.message}`);
}

// Check 5: Verify FAQ schema components exist
try {
  const faqSchemaPath = join(rootDir, 'components', 'seo', 'faq-schema.tsx');
  if (!existsSync(faqSchemaPath)) {
    warnings.push('⚠️  components/seo/faq-schema.tsx not found - FAQPage schema may be missing');
  } else {
    console.log('✅ FAQ schema component check passed');
  }
} catch (error) {
  warnings.push(`⚠️  Error checking FAQ schema: ${error.message}`);
}

// Summary
console.log('\n📊 SEO Check Summary:');
console.log(`   Errors: ${errors.length}`);
console.log(`   Warnings: ${warnings.length}\n`);

if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors:');
  errors.forEach(e => console.log(`   ${e}`));
  console.log('');
  process.exit(1);
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All SEO checks passed!\n');
  process.exit(0);
}

// Exit with code 0 if only warnings (non-blocking)
process.exit(0);
