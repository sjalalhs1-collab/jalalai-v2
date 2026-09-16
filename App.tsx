import { useEffect, useRef, useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

const videos = [
  ['Golden Hour','https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4'],
  ['Still Water','https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4'],
  ['Deep Woods','https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4'],
  ['Quiet Dawn','https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4'],
] as const;
const nav = ['How It Works','Features','Pricing','Community'];

export default function App() {
  const [active, setActive] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const timer = useRef<number>();
  const woods = active === 2;

  useEffect(() => () => timer.current && window.clearTimeout(timer.current), []);
  const switchVideo = (index: number) => {
    if (index === active || transitioning) return;
    setActive(index); setTransitioning(true);
    timer.current = window.setTimeout(() => setTransitioning(false), 1000);
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (email.trim()) alert(`Thanks — ${email} has been added to the early-access list.`); };

  return <section className="relative h-screen w-full overflow-hidden bg-black text-white">
    <div className="absolute inset-0 z-0">{videos.map(([label, src], i) => <video key={src} src={src} autoPlay muted loop playsInline preload={i===0?'auto':'metadata'} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${active===i?'opacity-100':'opacity-0'}`} />)}<div className="absolute inset-0 bg-black/20" /></div>
    <img className="train-bob pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover" src="https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png" alt="" aria-hidden="true" />
    <div className="relative z-[2] flex h-full flex-col px-5 py-5 sm:px-8 md:px-12 lg:px-16">
      <nav className="flex items-center justify-between"><a href="#" className="font-instrument text-2xl italic sm:text-3xl">Lumora</a>
        <div className="liquid-glass hidden items-center gap-1 rounded-full p-1 md:flex">{nav.map(item=><a key={item} href={`#${item.toLowerCase().replaceAll(' ','-')}`} className="rounded-full px-4 py-2 text-sm text-white/90 hover:text-white">{item}</a>)}<a href="#get-started" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:scale-[1.03]">Get Started</a></div>
        <button className="liquid-glass relative flex h-11 w-11 items-center justify-center rounded-full md:hidden" aria-label={menuOpen?'Close menu':'Open menu'} onClick={()=>setMenuOpen(!menuOpen)}><Menu className={`absolute transition duration-300 ${menuOpen?'rotate-90 scale-75 opacity-0':'opacity-100'}`} size={20}/><X className={`absolute transition duration-300 ${menuOpen?'opacity-100':'-rotate-90 scale-75 opacity-0'}`} size={20}/></button>
      </nav>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition duration-500 md:hidden ${menuOpen?'opacity-100':'pointer-events-none opacity-0'}`}><div className="flex flex-col items-center gap-7">{nav.map((item,i)=><a key={item} href={`#${item.toLowerCase().replaceAll(' ','-')}`} onClick={()=>setMenuOpen(false)} className="text-3xl transition duration-500" style={{transitionDelay:`${100+i*50}ms`,transform:menuOpen?'translateY(0)':'translateY(16px)',opacity:menuOpen?1:0}}>{item}</a>)}<a href="#get-started" onClick={()=>setMenuOpen(false)} className="mt-5 rounded-full bg-white px-7 py-3 font-semibold text-black">Get Started</a></div></div>
      <main className="flex flex-1 flex-col items-center justify-center pb-5 pt-16 text-center"><div className={`liquid-glass flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-xs transition-colors duration-700 sm:text-sm ${woods?'text-[#182C41]':'text-white'}`}><Sparkles size={14}/><span>Over 10,000 minds already finding their clarity</span></div>
        <h1 className={`mt-7 max-w-4xl font-instrument text-4xl leading-[1.1] transition-colors duration-700 sm:text-5xl md:text-7xl lg:text-[5.5rem] ${woods?'text-[#182C41]':'text-white'}`}>Clarity in an Endlessly<br/>Noisy Universe</h1>
        <p className={`mt-6 max-w-xl font-system text-sm leading-relaxed transition-colors duration-700 sm:text-base ${woods?'text-[#182C41]/85':'text-white/80'}`}>Rise above the chaos of pings, infinite scrolling, and relentless demands. Discover how to protect your presence and create with intention.</p>
        <form onSubmit={submit} className="liquid-glass mt-7 flex w-full max-w-[320px] items-center rounded-full p-1 sm:max-w-sm"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your Best Email" className={`min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:opacity-60 ${woods?'text-[#182C41] placeholder:text-[#182C41]':'text-white placeholder:text-white'}`}/><button className="shrink-0 rounded-full bg-white px-4 py-3 text-xs font-semibold text-black hover:scale-[1.03] active:scale-[.98] sm:px-5">Get Early Access</button></form>
        <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 font-system text-xs sm:text-sm">{videos.map(([label],i)=><button key={label} disabled={transitioning} onClick={()=>switchVideo(i)} className={`border-b pb-1 transition ${active===i?(woods?'border-[#182C41] text-[#182C41]':'border-white text-white'):(woods?'border-transparent text-[#182C41]/50 hover:text-[#182C41]/80':'border-transparent text-white/50 hover:text-white/80')}`}>{label}</button>)}</div>
      </main>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-1 font-system text-xs text-white/70 sm:text-sm"><span>60+ Deep Sessions</span><span className="hidden sm:inline">|</span><span>12,000+ Creators</span><span className="hidden sm:inline">|</span><span>4.8 User Satisfaction</span><span className="hidden sm:inline">|</span><span>Intentional-First Design</span></footer>
    </div>
  </section>;
}
