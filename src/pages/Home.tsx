// 首页 Home（路由 /）— 营销落地页，Lenis 平滑滚动 + 各区块组件
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroSection from '@/components/home/HeroSection';
import MiniDemo from '@/components/home/MiniDemo';
import HowItWorks from '@/components/home/HowItWorks';
import Curriculum from '@/components/home/Curriculum';
import FinalProject from '@/components/home/FinalProject';
import TwoPlayers from '@/components/home/TwoPlayers';
import StatsBand from '@/components/home/StatsBand';
import Faq from '@/components/home/Faq';
import BottomCta from '@/components/home/BottomCta';
import Footer from '@/components/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  // Lenis 平滑滚动（仅营销页启用），与 ScrollTrigger 同步
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const lenis = new Lenis({ smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-ink-950">
      <HeroSection onWatchDemo={scrollToDemo} />
      <MiniDemo />
      <HowItWorks />
      <Curriculum />
      <FinalProject />
      <TwoPlayers />
      <StatsBand />
      <Faq />
      <BottomCta />
      <Footer />
    </div>
  );
}
