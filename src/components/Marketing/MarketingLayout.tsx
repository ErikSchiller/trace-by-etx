import { useEffect } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CookiesBanner } from '../CookiesBanner';
import { C, fontBody } from './theme';
import { usePageTitle } from '../../hooks/usePageTitle';

export function MarketingLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  usePageTitle(title);
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: fontBody, minHeight: '100vh' }}>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CookiesBanner />
    </div>
  );
}

export default MarketingLayout;
