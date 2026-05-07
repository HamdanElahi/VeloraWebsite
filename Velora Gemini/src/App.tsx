/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth } from './lib/firebase';
import { 
  Utensils, 
  MapPin, 
  Phone, 
  Instagram, 
  Facebook, 
  Twitter, 
  ChevronRight, 
  Menu as MenuIcon, 
  X,
  Star,
  Clock,
  Users,
  Calendar
} from 'lucide-react';

// --- Types ---
type Page = 'home' | 'menu' | 'admin';

// --- Data ---
const FEATURED_DISHES = [
  {
    name: "Truffle Wagyu Carpaccio",
    price: "$42",
    desc: "Thinly sliced A5 Wagyu, shaved black truffles, aged parmesan, and micro-greens.",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Golden Sea Bass",
    price: "$58",
    desc: "Pan-seared Chilean sea bass with saffron foam and roasted heirloom carrots.",
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800"
  },
  {
    name: "Velora Signature Dome",
    price: "$24",
    desc: "24k gold leaf chocolate dome with warm salted caramel and hazelnut praline.",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=800"
  }
];

const REVIEWS = [
  { name: "Julian Thorne", role: "Food Critic", text: "Velora isn't just a restaurant; it's a sensory journey through elegance and flavor." },
  { name: "Elena Valli", role: "Vogue Lifestyle", text: "The most cinematic dining experience in the city. The gold leaf dessert is a must-try." },
  { name: "Marcus Reid", role: "Michelin Guide", text: "Impeccable service paired with culinary mastery. A beacon of luxury hospitality." }
];

const FULL_MENU = {
  Starters: [
    { name: "Oscietra Caviar", price: "$120", ingredients: "30g caviar, blinis, crème fraîche, chives" },
    { name: "Burrata & Heirloom", price: "$28", ingredients: "Creamy burrata, colorful tomatoes, basil oil, balsamic reduction" },
    { name: "Foie Gras Terrine", price: "$35", ingredients: "Fig jam, toasted brioche, fleur de sel" }
  ],
  MainCourse: [
    { name: "Dry-Aged Tomahawk", price: "$145", ingredients: "32oz steak, bone marrow butter, roasted garlic" },
    { name: "Lobster Thermidor", price: "$75", ingredients: "Atlantic lobster, cognac cream, mustard, gruyère crust" },
    { name: "Venison Loin", price: "$65", ingredients: "Juniper berry jus, parsnip purée, wild mushrooms" }
  ],
  Desserts: [
    { name: "Saffron Crème Brûlée", price: "$18", ingredients: "Persian saffron, vanilla bean, almond tuile" },
    { name: "Grand Marnier Soufflé", price: "$22", ingredients: "Classic orange soufflé, crème anglaise" },
    { name: "Artisanal Cheese Board", price: "$32", ingredients: "Selection of 5 European cheeses, honeycomb, crackers" }
  ]
};

// --- Components ---

const Navbar = ({ activePage, setPage }: { activePage: Page, setPage: (p: Page) => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-black/90 backdrop-blur-md py-4' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <button onClick={() => setPage('home')} className="text-3xl font-serif font-bold tracking-tighter text-gold italic cursor-pointer">
          Velora
        </button>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          <button 
            onClick={() => setPage('home')} 
            className={`uppercase text-xs tracking-widest transition-colors ${activePage === 'home' ? 'text-gold' : 'text-white/70 hover:text-white'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setPage('menu')} 
            className={`uppercase text-xs tracking-widest transition-colors ${activePage === 'menu' ? 'text-gold' : 'text-white/70 hover:text-white'}`}
          >
            Menu
          </button>
          <a href="#reserve" className="btn-outline text-xs py-2 px-6">Book Table</a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-gold" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl py-10 px-6 flex flex-col gap-6 items-center md:hidden border-b border-gold/20"
          >
            <button onClick={() => { setPage('home'); setIsMobileMenuOpen(false); }} className="text-lg tracking-widest text-white uppercase">Home</button>
            <button onClick={() => { setPage('menu'); setIsMobileMenuOpen(false); }} className="text-lg tracking-widest text-white uppercase">Menu</button>
            <a href="#reserve" onClick={() => setIsMobileMenuOpen(false)} className="btn-gold py-3 w-full text-center uppercase tracking-widest">Reserve</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = ({ setPage }: { setPage: (p: Page) => void }) => (
  <footer className="bg-black border-t border-white/5 py-20 px-6">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <h3 className="text-2xl font-serif mb-6 text-gold italic">Velora</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          Established in 2024, Velora is the culmination of luxury and artistic gastronomy.
        </p>
        <div className="flex gap-4">
          <a href="#" className="text-white/70 hover:text-gold transition-colors"><Instagram size={20} /></a>
          <a href="#" className="text-white/70 hover:text-gold transition-colors"><Facebook size={20} /></a>
          <a href="#" className="text-white/70 hover:text-gold transition-colors"><Twitter size={20} /></a>
        </div>
      </div>
      
      <div>
        <h4 className="uppercase text-xs tracking-widest text-gold mb-6">Location</h4>
        <p className="text-white/50 text-sm flex gap-3"><MapPin size={16} className="text-gold shrink-0" /> 12 Avenue des Champs-Élysées<br />Paris, 75008 France</p>
      </div>

      <div>
        <h4 className="uppercase text-xs tracking-widest text-gold mb-6">Contact</h4>
        <p className="text-white/50 text-sm flex gap-3 items-center"><Phone size={16} className="text-gold" /> +33 1 23 45 67 89</p>
        <p className="text-white/50 text-sm mt-2">reservations@velora.luxury</p>
      </div>

      <div>
        <h4 className="uppercase text-xs tracking-widest text-gold mb-6">Hours</h4>
        <p className="text-white/50 text-sm">Mon - Fri: 18:00 - 00:00</p>
        <p className="text-white/50 text-sm mt-1">Sat - Sun: 17:00 - 01:00</p>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-xs text-center md:text-left">
      <p>&copy; {new Date().getFullYear()} Velora Luxury Group. All rights reserved.</p>
      <button onClick={() => setPage('admin')} className="hover:text-gold transition-colors cursor-pointer">Staff Login</button>
    </div>
  </footer>
);

// --- Pages ---

const HomePage: React.FC<{ setPage: (p: Page) => void }> = ({ setPage }) => {
  const [reservationStatus, setReservationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const reservationFormRef = useRef<HTMLFormElement>(null);

  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const contactFormRef = useRef<HTMLFormElement>(null);

  const handleReservationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setReservationStatus('loading');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || null,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      guests: formData.get('guests') as string,
      seating: formData.get('seating') as string,
      special_request: formData.get('special_request') as string || null,
      created_at: serverTimestamp(),
      status: 'pending'
    };

    try {
      if (!data.name || !data.phone || !data.date || !data.time) {
        throw new Error("Please fill in all required fields.");
      }

      await addDoc(collection(db, 'reservations'), data);
      setReservationStatus('success');
      reservationFormRef.current?.reset();
      setTimeout(() => setReservationStatus('idle'), 5000);
    } catch (error) {
      setReservationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
      handleFirestoreError(error, OperationType.WRITE, 'reservations');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactStatus('loading');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
      created_at: serverTimestamp()
    };

    try {
      if (!data.name || !data.email || !data.message) {
        throw new Error("Please fill in all fields.");
      }

      await addDoc(collection(db, 'contacts'), data);
      setContactStatus('success');
      contactFormRef.current?.reset();
      setTimeout(() => setContactStatus('idle'), 5000);
    } catch (error) {
      setContactStatus('error');
      handleFirestoreError(error, OperationType.WRITE, 'contacts');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1920" 
            className="w-full h-full object-cover scale-110 motion-safe:animate-[pulse_10s_infinite]" 
            alt="Luxury Interior" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-6xl md:text-8xl font-serif mb-6 italic"
          >
            Experience Fine Dining <br/> Like Never Before
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-xl md:text-2xl text-white/70 mb-10 font-light tracking-wide"
          >
            Where taste meets elegance
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1, duration: 1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#reserve" className="btn-gold uppercase tracking-widest text-sm">Reserve Table</a>
            <button onClick={() => setPage('menu')} className="btn-outline uppercase tracking-widest text-sm">View Menu</button>
          </motion.div>
        </div>
      </section>

      {/* Featured Menu */}
      <section className="py-32 px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl mb-4">Featured Selection</h2>
            <p className="text-gold tracking-[0.3em] uppercase text-xs">Exquisite Culinary Art</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {FEATURED_DISHES.map((dish, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden mb-8 aspect-[4/5]">
                  <img 
                    src={dish.image} 
                    alt={dish.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-2xl font-serif italic text-gold">{dish.name}</h3>
                  <span className="text-sm font-medium">{dish.price}</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{dish.desc}</p>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-20 text-center">
            <button 
              onClick={() => setPage('menu')}
              className="group flex items-center gap-3 mx-auto text-gold uppercase tracking-widest text-xs hover:gap-5 transition-all"
            >
              View Full Menu <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2 relative">
             <div className="absolute -top-10 -left-10 w-40 h-40 border-t-2 border-l-2 border-gold/30 hidden lg:block" />
             <img 
               src="https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&q=80&w=1200" 
               className="w-full h-auto z-10 relative" 
               alt="Owner"
               referrerPolicy="no-referrer" 
             />
             <div className="absolute -bottom-6 -right-6 bg-gold p-8 text-black hidden lg:block">
                <span className="text-4xl font-serif italic">Est. 2024</span>
             </div>
          </div>
          <div className="lg:w-1/2">
            <span className="text-gold tracking-[0.3em] uppercase text-xs mb-6 block">Our Story</span>
            <h2 className="text-5xl font-serif mb-8 italic">The Pursuit of Culinary Elegance</h2>
            <p className="text-white/60 leading-loose mb-10 text-lg">
              Founded by visionary Chef Alexander Thorne, Velora was born out of a desire to create a sanctuary where the art of dining transcends the plate. Our philosophy is simple: source the rarest ingredients, honor traditional techniques, and present them in a way that feels utterly cinematic.
            </p>
            <p className="text-white/80 font-serif text-xl mb-4 italic">"Luxury is not about excess, but about the perfection of detail."</p>
            <p className="text-gold tracking-widest uppercase text-sm">- Alexander Thorne, Owner</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {REVIEWS.map((review, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#D4AF37" className="text-gold" />)}
                </div>
                <p className="text-lg italic text-white/80 mb-8 leading-relaxed">"{review.text}"</p>
                <div className="w-10 h-[1px] bg-gold mx-auto mb-4" />
                <h4 className="uppercase text-xs tracking-[0.2em]">{review.name}</h4>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{review.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reservation CTA & Form */}
      <section id="reserve" className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-white/5 p-10 md:p-20 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px]" />
          
          <div className="text-center mb-16">
            <h2 className="text-5xl font-serif mb-4 italic">Reserve Your Table Today</h2>
            <p className="text-white/40 tracking-wide">For inquiries over 10 guests, please contact us via phone.</p>
          </div>

          <form ref={reservationFormRef} className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={handleReservationSubmit}>
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Name *</label>
                 <input name="name" type="text" required placeholder="Your Full Name" className="input-field" />
               </div>
               <div>
                 <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Phone *</label>
                 <input name="phone" type="tel" required placeholder="+33 1 23 45 67 89" className="input-field" />
               </div>
               <div>
                 <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Email</label>
                 <input name="email" type="email" placeholder="email@luxury.com" className="input-field" />
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Date *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
                    <input name="date" type="date" required className="input-field pl-11" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Time *</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
                    <select name="time" required className="input-field pl-11 appearance-none">
                      <option value="18:00">18:00</option>
                      <option value="19:00">19:00</option>
                      <option value="20:00">20:00</option>
                      <option value="21:00">21:00</option>
                      <option value="22:00">22:00</option>
                      <option value="23:00">23:00</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Guests *</label>
                  <div className="relative">
                    <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50" />
                    <select name="guests" required className="input-field pl-11 appearance-none">
                      <option value="Single">Single</option>
                      <option value="Couple">Couple</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Seating *</label>
                  <select name="seating" required className="input-field appearance-none">
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Balcony">Balcony</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Special Request</label>
                <textarea name="special_request" rows={3} placeholder="Dietary requirements or special occasions..." className="input-field resize-none"></textarea>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 mt-8">
              <button 
                type="submit" 
                disabled={reservationStatus === 'loading'}
                className="btn-gold w-full text-sm uppercase tracking-[0.4em] py-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reservationStatus === 'loading' ? 'Processing...' : 'Book Now'}
              </button>
              
              <AnimatePresence>
                {reservationStatus === 'success' && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-gold text-center mt-6 tracking-widest text-sm"
                  >
                    RESERVATION CONFIRMED. WE LOOK FORWARD TO SERVING YOU.
                  </motion.p>
                )}
                {reservationStatus === 'error' && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-500 text-center mt-6 tracking-widest text-xs"
                  >
                    {errorMessage || "ERROR: PLEASE TRY AGAIN LATER."}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-32 px-6 bg-[#050505]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-20">
          <div className="md:w-1/3">
            <h2 className="text-4xl font-serif italic mb-6">Contact Us</h2>
            <p className="text-white/50 leading-relaxed mb-10">
              For general inquiries, press, or job opportunities, please reach out to us using the form.
            </p>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Direct Line</p>
                <p className="text-white/80">+33 1 23 45 67 89</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Email</p>
                <p className="text-white/80">concierge@velora.luxury</p>
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3">
            <form ref={contactFormRef} onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Name</label>
                  <input name="name" type="text" required className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Email</label>
                  <input name="email" type="email" required className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] text-gold block mb-2">Message</label>
                <textarea name="message" rows={5} required className="input-field resize-none"></textarea>
              </div>
              <button 
                type="submit" 
                disabled={contactStatus === 'loading'}
                className="btn-outline w-full md:w-auto px-12 py-4 uppercase tracking-[0.3em] text-xs disabled:opacity-50"
              >
                {contactStatus === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
              
              <AnimatePresence>
                {contactStatus === 'success' && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gold text-xs tracking-widest"
                  >
                    MESSAGE SENT. OUR CONCIERGE WILL RESPOND SHORTLY.
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

const MenuPage: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="pt-40 pb-32 px-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-32">
          <p className="text-gold tracking-[0.5em] uppercase text-sm mb-6">Culinary Collection</p>
          <h1 className="text-6xl md:text-8xl font-serif italic mb-8">The Menu</h1>
          <div className="w-20 h-[2px] bg-gold mx-auto" />
        </div>

        {Object.entries(FULL_MENU).map(([category, items], idx) => (
          <div key={idx} className="mb-24">
            <h2 className="text-3xl font-serif italic text-gold mb-12 flex items-center gap-6">
              {category.replace(/([A-Z])/g, ' $1').trim()}
              <div className="grow h-[1px] bg-white/10" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-20">
              {items.map((item, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-baseline border-b border-white/5 pb-2 mb-2 group-hover:border-gold/30 transition-colors">
                    <h3 className="text-xl font-medium tracking-wide">{item.name}</h3>
                    <span className="text-gold font-serif">{item.price}</span>
                  </div>
                  <p className="text-white/40 text-sm italic font-light">{item.ingredients}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-40 text-center border-t border-white/5 pt-20">
          <p className="text-white/30 text-sm italic">All prices are in USD and exclusive of 10% service charge.</p>
          <p className="text-white/30 text-sm mt-2 italic">Please inform your server of any food allergies.</p>
        </div>
      </div>
    </motion.div>
  );
};

const AdminPage: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const q = query(collection(db, 'reservations'), orderBy('created_at', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const res = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setReservations(res);
          setLoading(false);
        }, (err) => {
          setError("Access Denied. You do not have admin permissions.");
          setLoading(false);
        });
        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await deleteDoc(doc(db, 'reservations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reservations/${id}`);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gold tracking-widest uppercase">Authenticating...</div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-serif italic mb-8">Admin Access</h1>
        <button onClick={handleLogin} className="btn-gold uppercase tracking-[0.3em] text-xs">Login with Google</button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-serif italic mb-4 text-red-500">Unauthorized</h1>
        <p className="text-white/50 mb-8 max-w-md">Your account does not have permission to view the reservation dashboard. Please contact the administrator.</p>
        <button onClick={() => setReservations([])} className="btn-outline text-xs uppercase tracking-widest">Logout</button>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-32 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div>
            <p className="text-gold tracking-[0.4em] uppercase text-xs mb-4">Internal Dashboard</p>
            <h1 className="text-5xl font-serif italic">Reservations</h1>
          </div>
          <button onClick={() => auth.signOut()} className="text-white/30 hover:text-white text-xs uppercase tracking-widest transition-colors">Sign Out</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-6 uppercase text-[10px] tracking-widest text-gold font-normal">Guest</th>
                <th className="py-6 uppercase text-[10px] tracking-widest text-gold font-normal">Date & Time</th>
                <th className="py-6 uppercase text-[10px] tracking-widest text-gold font-normal">Details</th>
                <th className="py-6 uppercase text-[10px] tracking-widest text-gold font-normal">Status</th>
                <th className="py-6 uppercase text-[10px] tracking-widest text-gold font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="py-6">
                    <p className="font-medium">{res.name}</p>
                    <p className="text-xs text-white/40 mt-1">{res.phone} • {res.email || 'No Email'}</p>
                  </td>
                  <td className="py-6">
                    <p className="flex items-center gap-2"><Calendar size={12} className="text-gold" /> {res.date}</p>
                    <p className="flex items-center gap-2 mt-1 text-xs text-white/50"><Clock size={12} className="text-gold/50" /> {res.time}</p>
                  </td>
                  <td className="py-6">
                    <p className="text-sm">Guests: {res.guests}</p>
                    <p className="text-xs text-white/40 mt-1">Seating: {res.seating}</p>
                  </td>
                  <td className="py-6">
                    <span className="text-[10px] uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/10 rounded-full">{res.status}</span>
                  </td>
                  <td className="py-6">
                    <button 
                      onClick={() => handleDelete(res.id)}
                      className="text-white/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-white/20 italic font-serif">No reservations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <div className="min-h-screen">
      <Navbar activePage={currentPage} setPage={setCurrentPage} />
      
      <AnimatePresence mode="wait">
        {currentPage === 'home' && <HomePage key="home" setPage={setCurrentPage} />}
        {currentPage === 'menu' && <MenuPage key="menu" />}
        {currentPage === 'admin' && <AdminPage key="admin" />}
      </AnimatePresence>

      <Footer setPage={setCurrentPage} />
    </div>
  );
}

