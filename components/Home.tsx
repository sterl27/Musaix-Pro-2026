import React from 'react';
import { Play, Brain, Sliders, Mic, Palette, Users, Music, ArrowRight, Check, Image as ImageIcon, Lock } from 'lucide-react';

interface HomeProps {
  onNavigateToApp: () => void;
}

const Home: React.FC<HomeProps> = ({ onNavigateToApp }) => {
  return (
    <>
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
         {/* Background Gradients */}
         <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-musaix-purple/20 blur-[120px] rounded-full pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-musaix-cyan/20 blur-[120px] rounded-full pointer-events-none" />

         <div className="max-w-7xl mx-auto px-4 md:px-8 w-full relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-mono uppercase tracking-widest text-gray-300">Gemini 2.5 AI Powered</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight font-sans">
                Create Music with AI <br/>
                <span className="gradient-text">Like Never Before</span>
              </h1>
              
              <p className="text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                 Transform your musical ideas into reality. Generate lyrics, compositions, and album art instantly with our cutting-edge neural engines.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={onNavigateToApp}
                  className="px-8 py-4 bg-musaix-accent hover:bg-musaix-accentHover text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-[0_0_30px_rgba(208,9,226,0.3)]"
                >
                  <Play className="w-5 h-5 fill-current" /> Try Demo
                </button>
                <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-bold text-lg backdrop-blur-md transition-all">
                  Learn More
                </button>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                 <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="flex gap-2 items-end h-32">
                          {[...Array(12)].map((_, i) => (
                            <div 
                              key={i} 
                              className="w-4 bg-musaix-accent rounded-t-sm animate-pulse"
                              style={{ 
                                height: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.1}s` 
                              }}
                            ></div>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="h-2 w-32 bg-white/20 rounded mb-2"></div>
                      <div className="h-2 w-20 bg-white/10 rounded"></div>
                    </div>
                    <Play className="w-8 h-8 text-white fill-current" />
                 </div>
              </div>
            </div>
         </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-musaix-dark relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 font-sans">Powerful AI Music Tools</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to create, edit, and produce professional music with artificial intelligence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "AI Composition", desc: "Generate original melodies, harmonies, and rhythms using advanced machine learning algorithms." },
              { icon: Sliders, title: "Smart Mixing", desc: "Automatically balance and enhance your tracks with AI-powered mixing and mastering tools." },
              { icon: Mic, title: "Voice Synthesis", desc: "Create realistic vocal performances in any style or language with our neural voice engine." },
              { icon: Palette, title: "Style Transfer", desc: "Transform your music into any genre or style while preserving the original melody." },
              { icon: Users, title: "Collaboration", desc: "Work together in real-time with other musicians and producers from around the world." },
              { icon: Music, title: "Audio Enhancement", desc: "Improve audio quality, remove noise, and restore old recordings with AI processing." },
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-musaix-accent/50 hover:bg-white/10 transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-musaix-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-musaix-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-sans">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI TOOLS SHOWCASE */}
      <section id="demo" className="py-24 relative overflow-hidden bg-black/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1">
                <div className="bg-musaix-card border border-white/10 rounded-2xl p-6 relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-musaix-accent/20 blur-[50px] pointer-events-none"></div>
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold">G</div>
                      <div>
                         <h4 className="font-bold">Gemini 2.5 Flash</h4>
                         <p className="text-xs text-gray-400">Context Window: 1M Tokens</p>
                      </div>
                   </div>
                   <div className="space-y-4 font-mono text-sm">
                      <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-gray-300">
                         User: Generate a synthwave track about neon cities...
                      </div>
                      <div className="p-3 bg-musaix-accent/10 rounded-lg border border-musaix-accent/20 text-musaix-accent">
                         AI: Analyzing mood... Detecting tempo 128 BPM... Generating chord progression Am - F - C - G...
                      </div>
                   </div>
                </div>
                <div className="mt-6 bg-musaix-card border border-white/10 rounded-2xl p-6 relative">
                   <div className="flex items-center gap-4 mb-4">
                      <ImageIcon className="w-6 h-6 text-musaix-cyan" />
                      <h4 className="font-bold">Gemini 3.0 Pro Image</h4>
                   </div>
                   <div className="h-40 bg-gray-900 rounded-lg flex items-center justify-center border border-white/5">
                       <div className="text-center">
                          <div className="animate-spin w-6 h-6 border-2 border-musaix-cyan border-t-transparent rounded-full mx-auto mb-2"></div>
                          <span className="text-xs text-gray-500">Rendering 4K Cover Art...</span>
                       </div>
                   </div>
                </div>
             </div>
             <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 font-sans">Next-Gen Models</h2>
                <p className="text-gray-400 mb-8 text-lg">
                  We leverage the latest models from Google DeepMind. Gemini 2.5 Flash handles complex lyrical structures and composition theory, while Gemini 3 Pro generates stunning, high-resolution album artwork.
                </p>
                <ul className="space-y-4">
                   {[
                     "Sub-second latency for real-time composition",
                     "1 Million token context window for full album coherence",
                     "Multimodal understanding of image, audio, and text",
                     "State-of-the-art reasoning for music theory"
                   ].map((item, i) => (
                     <li key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                     </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-musaix-dark relative z-10">
         <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold mb-4 font-sans">Simple Pricing</h2>
               <p className="text-gray-400">Start for free, upgrade for professional power.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
               {/* FREE */}
               <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                  <h3 className="text-xl font-bold mb-2">Starter</h3>
                  <div className="text-3xl font-bold mb-6">$0 <span className="text-sm text-gray-500 font-normal">/mo</span></div>
                  <ul className="space-y-4 mb-8 text-sm text-gray-300">
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> 5 Songs per month</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> Standard Quality Art</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> MP3 Download</li>
                     <li className="flex gap-2 text-gray-600"><Lock className="w-4 h-4" /> Commercial Rights</li>
                  </ul>
                  <button onClick={onNavigateToApp} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">Get Started</button>
               </div>

               {/* PRO */}
               <div className="bg-musaix-card border border-musaix-accent rounded-2xl p-8 relative transform md:-translate-y-4 shadow-2xl shadow-musaix-accent/10">
                  <div className="absolute top-0 right-0 bg-musaix-accent text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase">Popular</div>
                  <h3 className="text-xl font-bold mb-2 text-musaix-accent">Pro Artist</h3>
                  <div className="text-3xl font-bold mb-6">$29 <span className="text-sm text-gray-500 font-normal">/mo</span></div>
                  <ul className="space-y-4 mb-8 text-sm text-gray-300">
                     <li className="flex gap-2"><Check className="w-4 h-4 text-musaix-accent" /> Unlimited Songs</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-musaix-accent" /> Gemini 3.0 Art Gen</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-musaix-accent" /> WAV + Stems Export</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-musaix-accent" /> Commercial Rights</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-musaix-accent" /> Priority Support</li>
                  </ul>
                  <button onClick={onNavigateToApp} className="w-full py-3 bg-musaix-accent hover:bg-musaix-accentHover text-white rounded-xl font-bold transition-colors shadow-lg">Upgrade Now</button>
               </div>

               {/* STUDIO */}
               <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors">
                  <h3 className="text-xl font-bold mb-2">Studio</h3>
                  <div className="text-3xl font-bold mb-6">$99 <span className="text-sm text-gray-500 font-normal">/mo</span></div>
                  <ul className="space-y-4 mb-8 text-sm text-gray-300">
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> Everything in Pro</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> API Access</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> Multi-User Team</li>
                     <li className="flex gap-2"><Check className="w-4 h-4 text-green-500" /> Custom Voice Training</li>
                  </ul>
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">Contact Sales</button>
               </div>
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-r from-musaix-purple to-musaix-accent opacity-10"></div>
         <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
           <h2 className="text-4xl md:text-5xl font-bold mb-6 font-sans">Ready to Create Amazing Music?</h2>
           <p className="text-xl text-gray-300 mb-10">Join thousands of musicians and producers who are already using AI to enhance their creativity.</p>
           <button onClick={onNavigateToApp} className="px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2">
              Get Started Now <ArrowRight className="w-5 h-5" />
           </button>
         </div>
      </section>
    </>
  );
};

export default Home;