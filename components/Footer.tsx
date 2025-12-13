import React from 'react';
import { Music } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black py-12 border-t border-white/10">
       <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
             <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-musaix-accent" />
                <span className="text-xl font-bold">Musaix Pro</span>
             </div>
             <p className="text-gray-500 text-sm">The future of music creation powered by artificial intelligence.</p>
          </div>
          
          {[
            { title: "Product", links: ["Features", "Pricing", "API", "Integrations"] },
            { title: "Support", links: ["Help Center", "Contact Us", "Community", "Status"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Press"] }
          ].map((col, i) => (
            <div key={i}>
               <h4 className="font-bold mb-4">{col.title}</h4>
               <ul className="space-y-2 text-sm text-gray-500">
                  {col.links.map((link, j) => (
                    <li key={j}><a href="#" className="hover:text-musaix-accent transition-colors">{link}</a></li>
                  ))}
               </ul>
            </div>
          ))}
       </div>
       <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pt-8 border-t border-white/10 flex justify-between items-center text-xs text-gray-600">
          <p>© 2025 Musaix Pro. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
       </div>
    </footer>
  );
};

export default Footer;